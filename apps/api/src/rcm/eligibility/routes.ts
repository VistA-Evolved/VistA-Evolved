/**
 * Phase 100 — Eligibility + Claim Status API Routes
 *
 * Endpoints:
 *   POST /rcm/eligibility/check        — Run eligibility check (manual/sandbox/edi-stub)
 *   GET  /rcm/eligibility/history       — Paginated eligibility check history
 *   GET  /rcm/eligibility/stats         — Aggregate eligibility statistics
 *   GET  /rcm/eligibility/:id           — Get single eligibility check
 *   POST /rcm/claim-status/check        — Run claim status check
 *   POST /rcm/claim-status/schedule     — Schedule recurring claim status poll
 *   GET  /rcm/claim-status/history      — Paginated claim status history
 *   GET  /rcm/claim-status/timeline     — Claim-specific status timeline
 *   GET  /rcm/claim-status/stats        — Aggregate claim status statistics
 *   GET  /rcm/claim-status/:id          — Get single claim status check
 *   GET  /rcm/eligibility-adapters      — List available eligibility adapters
 *
 * All routes under /rcm/ — existing security catch-all covers session auth.
 * Mutations wired to appendRcmAudit.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  insertEligibilityCheck,
  getEligibilityCheckById,
  listEligibilityChecks,
  getEligibilityStats,
  insertClaimStatusCheck,
  getClaimStatusCheckById,
  listClaimStatusChecks,
  getClaimStatusTimeline,
  getClaimStatusStats,
} from "./store.js";
import { appendRcmAudit } from "../audit/rcm-audit.js";
import { getPayerAdapterForMode, listPayerAdapters } from "../adapters/payer-adapter.js";
import { getJobQueue } from "../jobs/queue.js";
import { log } from "../../lib/logger.js";
import type {
  EligibilityProvenance,
  ClaimStatusProvenance,
} from "./types.js";

/* ── Session helper ────────────────────────────────────────── */

function getSession(request: FastifyRequest): { duz: string; tenantId: string } {
  const s = (request as any).session;
  return {
    duz: s?.duz ?? "system",
    tenantId: s?.tenantId ?? "default",
  };
}

/* ── Provenance validation ─────────────────────────────────── */

const VALID_ELIG_PROVENANCES = new Set<string>(["MANUAL", "SANDBOX", "EDI_270_271", "CLEARINGHOUSE", "PORTAL"]);
const VALID_CSTAT_PROVENANCES = new Set<string>(["MANUAL", "SANDBOX", "EDI_276_277", "CLEARINGHOUSE", "PORTAL"]);

/* ── Route Registration ────────────────────────────────────── */

export default async function eligibilityRoutes(server: FastifyInstance): Promise<void> {

  /* ================================================================ */
  /* ELIGIBILITY ENDPOINTS                                            */
  /* ================================================================ */

  /** POST /rcm/eligibility/check — Run eligibility check */
  server.post("/rcm/eligibility/check", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { duz, tenantId } = getSession(request);

    // Validate required fields
    if (!body.patientDfn || !body.payerId) {
      return reply.status(400).send({ ok: false, error: "patientDfn and payerId are required" });
    }

    const provenance: EligibilityProvenance = body.provenance ?? "SANDBOX";
    if (!VALID_ELIG_PROVENANCES.has(provenance)) {
      return reply.status(400).send({ ok: false, error: `Invalid provenance: ${provenance}` });
    }

    const start = Date.now();

    // MANUAL provenance: user enters result directly
    if (provenance === "MANUAL") {
      const manual = body.manualResult || {};
      const record = insertEligibilityCheck({
        patientDfn: String(body.patientDfn),
        payerId: String(body.payerId),
        subscriberId: body.subscriberId ?? null,
        memberId: body.memberId ?? null,
        dateOfService: body.dateOfService ?? null,
        provenance: "MANUAL",
        eligible: manual.eligible ?? null,
        status: "completed",
        responseJson: JSON.stringify({ ...manual, enteredBy: duz }),
        errorMessage: null,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      appendRcmAudit("eligibility.checked", {
        payerId: body.payerId,
        userId: duz,
        detail: { checkId: record.id, provenance: "MANUAL", eligible: manual.eligible },
      });

      return reply.status(201).send({ ok: true, check: record });
    }

    // EDI stub provenances: return integration-pending without external call
    if (provenance === "EDI_270_271" || provenance === "CLEARINGHOUSE") {
      const record = insertEligibilityCheck({
        patientDfn: String(body.patientDfn),
        payerId: String(body.payerId),
        subscriberId: body.subscriberId ?? null,
        memberId: body.memberId ?? null,
        dateOfService: body.dateOfService ?? null,
        provenance,
        eligible: null,
        status: "integration_pending",
        responseJson: JSON.stringify({
          integrationPending: true,
          transactionSet: "270/271",
          description: "EDI clearinghouse enrollment required for live eligibility inquiry",
          requirements: [
            "Clearinghouse enrollment",
            "Trading partner agreement",
            "HIPAA 5010 certification",
          ],
        }),
        errorMessage: null,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      appendRcmAudit("eligibility.checked", {
        payerId: body.payerId,
        userId: duz,
        detail: { checkId: record.id, provenance, status: "integration_pending" },
      });

      return reply.status(201).send({ ok: true, check: record });
    }

    // SANDBOX / PORTAL: use adapter
    try {
      const adapter = getPayerAdapterForMode(provenance === "SANDBOX" ? "sandbox" : "portal");
      if (!adapter) {
        const record = insertEligibilityCheck({
          patientDfn: String(body.patientDfn),
          payerId: String(body.payerId),
          subscriberId: body.subscriberId ?? null,
          memberId: body.memberId ?? null,
          dateOfService: body.dateOfService ?? null,
          provenance,
          eligible: null,
          status: "failed",
          responseJson: null,
          errorMessage: `No adapter available for provenance: ${provenance}`,
          responseMs: Date.now() - start,
          checkedBy: duz,
          tenantId,
        });
        return reply.status(200).send({ ok: true, check: record });
      }

      const response = await adapter.checkEligibility({
        patientDfn: String(body.patientDfn),
        payerId: String(body.payerId),
        subscriberId: body.subscriberId,
        memberId: body.memberId,
        dateOfService: body.dateOfService,
        tenantId,
      });

      const record = insertEligibilityCheck({
        patientDfn: String(body.patientDfn),
        payerId: String(body.payerId),
        subscriberId: body.subscriberId ?? null,
        memberId: body.memberId ?? null,
        dateOfService: body.dateOfService ?? null,
        provenance,
        eligible: response.eligible,
        status: "completed",
        responseJson: JSON.stringify(response),
        errorMessage: null,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      appendRcmAudit("eligibility.checked", {
        payerId: body.payerId,
        userId: duz,
        detail: { checkId: record.id, provenance, eligible: response.eligible },
      });

      return reply.status(201).send({ ok: true, check: record });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const record = insertEligibilityCheck({
        patientDfn: String(body.patientDfn),
        payerId: String(body.payerId),
        subscriberId: body.subscriberId ?? null,
        memberId: body.memberId ?? null,
        dateOfService: body.dateOfService ?? null,
        provenance,
        eligible: null,
        status: "failed",
        responseJson: null,
        errorMessage: errMsg,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      log.warn("Eligibility check failed", { payerId: body.payerId, error: errMsg });
      return reply.status(200).send({ ok: true, check: record });
    }
  });

  /** GET /rcm/eligibility/history — Paginated history */
  server.get("/rcm/eligibility/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const result = listEligibilityChecks({
      patientDfn: q.patientDfn,
      payerId: q.payerId,
      provenance: q.provenance,
      tenantId: q.tenantId,
      limit: parseInt(q.limit ?? "50", 10) || 50,
      offset: parseInt(q.offset ?? "0", 10) || 0,
    });
    return reply.send({ ok: true, ...result });
  });

  /** GET /rcm/eligibility/stats — Aggregate statistics */
  server.get("/rcm/eligibility/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const stats = getEligibilityStats(q.tenantId);
    return reply.send({ ok: true, stats });
  });

  /** GET /rcm/eligibility/:id — Get single check */
  server.get("/rcm/eligibility/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const check = getEligibilityCheckById(id);
    if (!check) {
      return reply.status(404).send({ ok: false, error: "Eligibility check not found" });
    }
    return reply.send({ ok: true, check });
  });

  /* ================================================================ */
  /* CLAIM STATUS ENDPOINTS                                           */
  /* ================================================================ */

  /** POST /rcm/claim-status/check — Run claim status check */
  server.post("/rcm/claim-status/check", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { duz, tenantId } = getSession(request);

    if (!body.claimRef || !body.payerId) {
      return reply.status(400).send({ ok: false, error: "claimRef and payerId are required" });
    }

    const provenance: ClaimStatusProvenance = body.provenance ?? "SANDBOX";
    if (!VALID_CSTAT_PROVENANCES.has(provenance)) {
      return reply.status(400).send({ ok: false, error: `Invalid provenance: ${provenance}` });
    }

    const start = Date.now();

    // MANUAL provenance
    if (provenance === "MANUAL") {
      const manual = body.manualResult || {};
      const record = insertClaimStatusCheck({
        claimRef: String(body.claimRef),
        payerId: String(body.payerId),
        payerClaimId: body.payerClaimId ?? null,
        provenance: "MANUAL",
        claimStatus: manual.claimStatus ?? null,
        adjudicationDate: manual.adjudicationDate ?? null,
        paidAmountCents: manual.paidAmountCents ?? null,
        status: "completed",
        responseJson: JSON.stringify({ ...manual, enteredBy: duz }),
        errorMessage: null,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      appendRcmAudit("claim_status.checked", {
        claimId: body.claimRef,
        payerId: body.payerId,
        userId: duz,
        detail: { checkId: record.id, provenance: "MANUAL", claimStatus: manual.claimStatus },
      });

      return reply.status(201).send({ ok: true, check: record });
    }

    // EDI stub provenances
    if (provenance === "EDI_276_277" || provenance === "CLEARINGHOUSE") {
      const record = insertClaimStatusCheck({
        claimRef: String(body.claimRef),
        payerId: String(body.payerId),
        payerClaimId: body.payerClaimId ?? null,
        provenance,
        claimStatus: null,
        adjudicationDate: null,
        paidAmountCents: null,
        status: "integration_pending",
        responseJson: JSON.stringify({
          integrationPending: true,
          transactionSet: "276/277",
          description: "EDI clearinghouse enrollment required for live claim status inquiry",
          requirements: [
            "Clearinghouse enrollment with 276/277",
            "Payer trading partner agreement",
            "HIPAA 5010 certification",
          ],
        }),
        errorMessage: null,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      appendRcmAudit("claim_status.checked", {
        claimId: body.claimRef,
        payerId: body.payerId,
        userId: duz,
        detail: { checkId: record.id, provenance, status: "integration_pending" },
      });

      return reply.status(201).send({ ok: true, check: record });
    }

    // SANDBOX / PORTAL: use adapter
    try {
      const adapter = getPayerAdapterForMode(provenance === "SANDBOX" ? "sandbox" : "portal");
      if (!adapter) {
        const record = insertClaimStatusCheck({
          claimRef: String(body.claimRef),
          payerId: String(body.payerId),
          payerClaimId: body.payerClaimId ?? null,
          provenance,
          claimStatus: null,
          adjudicationDate: null,
          paidAmountCents: null,
          status: "failed",
          responseJson: null,
          errorMessage: `No adapter available for provenance: ${provenance}`,
          responseMs: Date.now() - start,
          checkedBy: duz,
          tenantId,
        });
        return reply.status(200).send({ ok: true, check: record });
      }

      const response = await adapter.pollClaimStatus({
        claimId: String(body.claimRef),
        payerClaimId: body.payerClaimId,
        payerId: String(body.payerId),
        tenantId,
      });

      const paidCents = response.paidAmount != null
        ? Math.round(response.paidAmount * 100)
        : null;

      const record = insertClaimStatusCheck({
        claimRef: String(body.claimRef),
        payerId: String(body.payerId),
        payerClaimId: body.payerClaimId ?? response.payerClaimId ?? null,
        provenance,
        claimStatus: response.status,
        adjudicationDate: response.adjudicationDate ?? null,
        paidAmountCents: paidCents,
        status: "completed",
        responseJson: JSON.stringify(response),
        errorMessage: null,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      appendRcmAudit("claim_status.checked", {
        claimId: body.claimRef,
        payerId: body.payerId,
        userId: duz,
        detail: { checkId: record.id, provenance, claimStatus: response.status },
      });

      return reply.status(201).send({ ok: true, check: record });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const record = insertClaimStatusCheck({
        claimRef: String(body.claimRef),
        payerId: String(body.payerId),
        payerClaimId: body.payerClaimId ?? null,
        provenance,
        claimStatus: null,
        adjudicationDate: null,
        paidAmountCents: null,
        status: "failed",
        responseJson: null,
        errorMessage: errMsg,
        responseMs: Date.now() - start,
        checkedBy: duz,
        tenantId,
      });

      log.warn("Claim status check failed", { claimRef: body.claimRef, error: errMsg });
      return reply.status(200).send({ ok: true, check: record });
    }
  });

  /** POST /rcm/claim-status/schedule — Schedule recurring poll via job queue */
  server.post("/rcm/claim-status/schedule", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { duz } = getSession(request);

    if (!body.claimRef || !body.payerId) {
      return reply.status(400).send({ ok: false, error: "claimRef and payerId are required" });
    }

    const queue = getJobQueue();
    const jobResult = await queue.enqueue({
      type: "STATUS_POLL",
      payload: {
        claimId: body.claimRef,
        payerCode: body.payerId,
        payerClaimId: body.payerClaimId,
        integrationMode: "sandbox",
      },
      priority: Math.max(0, Math.min(9, parseInt(body.priority ?? "5", 10) || 5)),
    });

    appendRcmAudit("claim_status.scheduled", {
      claimId: body.claimRef,
      payerId: body.payerId,
      userId: duz,
      detail: { jobId: jobResult, maxPolls: body.maxPolls },
    });

    return reply.status(201).send({
      ok: true,
      scheduled: true,
      jobId: jobResult,
      claimRef: body.claimRef,
      payerId: body.payerId,
    });
  });

  /** GET /rcm/claim-status/history — Paginated history */
  server.get("/rcm/claim-status/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const result = listClaimStatusChecks({
      claimRef: q.claimRef,
      payerId: q.payerId,
      provenance: q.provenance,
      tenantId: q.tenantId,
      limit: parseInt(q.limit ?? "50", 10) || 50,
      offset: parseInt(q.offset ?? "0", 10) || 0,
    });
    return reply.send({ ok: true, ...result });
  });

  /** GET /rcm/claim-status/timeline — Claim-specific timeline */
  server.get("/rcm/claim-status/timeline", async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    if (!q.claimRef) {
      return reply.status(400).send({ ok: false, error: "claimRef query parameter required" });
    }
    const timeline = getClaimStatusTimeline(q.claimRef, q.tenantId);
    return reply.send({ ok: true, claimRef: q.claimRef, timeline, total: timeline.length });
  });

  /** GET /rcm/claim-status/stats — Aggregate statistics */
  server.get("/rcm/claim-status/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const stats = getClaimStatusStats(q.tenantId);
    return reply.send({ ok: true, stats });
  });

  /** GET /rcm/claim-status/:id — Get single check */
  server.get("/rcm/claim-status/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const check = getClaimStatusCheckById(id);
    if (!check) {
      return reply.status(404).send({ ok: false, error: "Claim status check not found" });
    }
    return reply.send({ ok: true, check });
  });

  /* ================================================================ */
  /* ADAPTER LISTING                                                  */
  /* ================================================================ */

  /** GET /rcm/eligibility-adapters — List available adapters */
  server.get("/rcm/eligibility-adapters", async (_request: FastifyRequest, reply: FastifyReply) => {
    const adapters = listPayerAdapters();
    return reply.send({
      ok: true,
      adapters,
      availableProvenances: {
        eligibility: ["MANUAL", "SANDBOX", "EDI_270_271", "CLEARINGHOUSE", "PORTAL"],
        claimStatus: ["MANUAL", "SANDBOX", "EDI_276_277", "CLEARINGHOUSE", "PORTAL"],
      },
      integrationStatus: {
        MANUAL: "available",
        SANDBOX: "available",
        EDI_270_271: "integration_pending",
        EDI_276_277: "integration_pending",
        CLEARINGHOUSE: "integration_pending",
        PORTAL: "integration_pending",
      },
    });
  });
}
