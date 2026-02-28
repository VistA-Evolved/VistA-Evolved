/**
 * Claim Lifecycle Routes -- Phase 111
 *
 * REST endpoints for the full claim draft lifecycle:
 * drafts, scrubbing, transitions, denials, resubmission, metrics.
 *
 * Endpoints:
 *   POST   /rcm/claim-lifecycle/drafts                   -- create draft
 *   GET    /rcm/claim-lifecycle/drafts                   -- list drafts
 *   GET    /rcm/claim-lifecycle/drafts/stats              -- draft statistics
 *   GET    /rcm/claim-lifecycle/drafts/aging              -- aging denials
 *   GET    /rcm/claim-lifecycle/drafts/:id                -- get draft
 *   PATCH  /rcm/claim-lifecycle/drafts/:id                -- update draft
 *   POST   /rcm/claim-lifecycle/drafts/:id/transition     -- transition status
 *   POST   /rcm/claim-lifecycle/drafts/:id/scrub          -- run scrubber
 *   POST   /rcm/claim-lifecycle/drafts/:id/denial         -- record denial
 *   POST   /rcm/claim-lifecycle/drafts/:id/resubmit       -- create resubmission
 *   POST   /rcm/claim-lifecycle/drafts/:id/appeal-packet  -- set appeal packet
 *   GET    /rcm/claim-lifecycle/drafts/:id/events         -- lifecycle events
 *   GET    /rcm/claim-lifecycle/drafts/:id/scrub-results  -- scrub results
 *
 *   POST   /rcm/claim-lifecycle/rules                     -- create scrub rule
 *   GET    /rcm/claim-lifecycle/rules                     -- list scrub rules
 *   GET    /rcm/claim-lifecycle/rules/:id                 -- get scrub rule
 *   PATCH  /rcm/claim-lifecycle/rules/:id                 -- update scrub rule
 *   DELETE /rcm/claim-lifecycle/rules/:id                 -- delete scrub rule
 *
 *   GET    /rcm/claim-lifecycle/metrics                   -- dashboard metrics
 *   GET    /rcm/claim-lifecycle/metrics/scrub             -- scrub metrics
 *
 * Auth: /rcm/ catch-all in AUTH_RULES covers session auth.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  createClaimDraft,
  getClaimDraftById,
  listClaimDrafts,
  updateClaimDraft,
  transitionClaimDraft,
  recordDenial,
  createResubmission,
  setAppealPacket,
  getLifecycleEvents,
  getClaimDraftStats,
  getAgingDenials,
  type ClaimDraftStatus,
} from "./claim-draft-repo.js";
import {
  createScrubRule,
  getScrubRuleById,
  listScrubRules,
  updateScrubRule,
  deleteScrubRule,
  getScrubResults,
} from "./scrub-rule-repo.js";
import { scrubClaimDraft, getScrubDashboardMetrics } from "./scrubber.js";
import { appendRcmAudit } from "../audit/rcm-audit.js";
import { safeErr } from "../../lib/safe-error.js";

const claimLifecycleRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /* ================================================================ */
  /* Claim Drafts                                                      */
  /* ================================================================ */

  /* -- POST /rcm/claim-lifecycle/drafts -- create ------------------- */
  server.post("/rcm/claim-lifecycle/drafts", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.patientId || !body.providerId || !body.payerId || !body.dateOfService) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required fields: patientId, providerId, payerId, dateOfService",
      });
    }
    try {
      const draft = await createClaimDraft({
        tenantId: body.tenantId,
        idempotencyKey: body.idempotencyKey,
        claimType: body.claimType,
        encounterId: body.encounterId,
        patientId: body.patientId,
        patientName: body.patientName,
        providerId: body.providerId,
        billingProviderId: body.billingProviderId,
        payerId: body.payerId,
        payerName: body.payerName,
        dateOfService: body.dateOfService,
        diagnoses: body.diagnoses,
        lines: body.lines,
        attachments: body.attachments,
        totalChargeCents: body.totalChargeCents,
        vistaChargeIen: body.vistaChargeIen,
        vistaArIen: body.vistaArIen,
        metadata: body.metadata,
        createdBy: body.createdBy || "system",
      });
      appendRcmAudit("draft.created", {
        userId: body.createdBy || "system",
        detail: { draftId: draft.id, payerId: draft.payerId, patient: draft.patientId },
      });
      return reply.code(201).send({ ok: true, draft });
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- GET /rcm/claim-lifecycle/drafts -- list ---------------------- */
  server.get("/rcm/claim-lifecycle/drafts", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const drafts = await listClaimDrafts(tenantId, {
      status: q.status,
      payerId: q.payerId,
      patientId: q.patientId,
      encounterId: q.encounterId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    }, parseInt(q.limit) || 100, parseInt(q.offset) || 0);
    return { ok: true, drafts, count: drafts.length };
  });

  /* -- GET /rcm/claim-lifecycle/drafts/stats -- statistics ---------- */
  server.get("/rcm/claim-lifecycle/drafts/stats", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const stats = await getClaimDraftStats(tenantId);
    return { ok: true, stats };
  });

  /* -- GET /rcm/claim-lifecycle/drafts/aging -- aging denials ------- */
  server.get("/rcm/claim-lifecycle/drafts/aging", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const olderThanDays = parseInt(q.olderThanDays) || 30;
    const aging = await getAgingDenials(tenantId, olderThanDays);
    return { ok: true, aging, count: aging.length };
  });

  /* -- GET /rcm/claim-lifecycle/drafts/:id -- get draft ------------- */
  server.get("/rcm/claim-lifecycle/drafts/:id", async (request, reply) => {
    const { id } = request.params as any;
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const draft = await getClaimDraftById(tenantId, id);
    if (!draft) return reply.code(404).send({ ok: false, error: "Draft not found" });
    return { ok: true, draft };
  });

  /* -- PATCH /rcm/claim-lifecycle/drafts/:id -- update -------------- */
  server.patch("/rcm/claim-lifecycle/drafts/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    try {
      const draft = await updateClaimDraft(tenantId, id, {
        patientName: body.patientName,
        providerId: body.providerId,
        billingProviderId: body.billingProviderId,
        payerName: body.payerName,
        diagnoses: body.diagnoses,
        lines: body.lines,
        attachments: body.attachments,
        totalChargeCents: body.totalChargeCents,
        metadata: body.metadata,
      }, body.actor || "system");
      if (!draft) return reply.code(404).send({ ok: false, error: "Draft not found" });
      appendRcmAudit("draft.updated", {
        userId: body.actor || "system",
        detail: { draftId: id },
      });
      return { ok: true, draft };
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- POST /rcm/claim-lifecycle/drafts/:id/transition -------------- */
  server.post("/rcm/claim-lifecycle/drafts/:id/transition", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.toStatus) {
      return reply.code(400).send({ ok: false, error: "Missing toStatus" });
    }
    const tenantId = body.tenantId || "default";
    try {
      const draft = await transitionClaimDraft(
        tenantId, id, body.toStatus as ClaimDraftStatus,
        body.actor || "system",
        {
          reason: body.reason,
          denialCode: body.denialCode,
          paidAmountCents: body.paidAmountCents,
          adjustmentCents: body.adjustmentCents,
          patientRespCents: body.patientRespCents,
        },
      );
      if (!draft) return reply.code(404).send({ ok: false, error: "Draft not found" });
      appendRcmAudit("draft.transition", {
        userId: body.actor || "system",
        detail: { draftId: id, toStatus: body.toStatus },
      });
      return { ok: true, draft };
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- POST /rcm/claim-lifecycle/drafts/:id/scrub -- run scrubber --- */
  server.post("/rcm/claim-lifecycle/drafts/:id/scrub", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    const draft = await getClaimDraftById(tenantId, id);
    if (!draft) return reply.code(404).send({ ok: false, error: "Draft not found" });

    const outcome = await scrubClaimDraft(draft, {
      autoTransition: body.autoTransition !== false,
    });
    appendRcmAudit("draft.scrubbed", {
      userId: body.actor || "system",
      detail: {
        draftId: id,
        score: outcome.score,
        passed: outcome.passed,
        blockingCount: outcome.blockingCount,
      },
    });
    return { ok: true, outcome };
  });

  /* -- POST /rcm/claim-lifecycle/drafts/:id/denial -- record denial - */
  server.post("/rcm/claim-lifecycle/drafts/:id/denial", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.denialCode || !body.denialReason) {
      return reply.code(400).send({ ok: false, error: "Missing denialCode and denialReason" });
    }
    const tenantId = body.tenantId || "default";
    try {
      const draft = await recordDenial(tenantId, id, body.denialCode, body.denialReason, body.actor || "system");
      if (!draft) return reply.code(404).send({ ok: false, error: "Draft not found" });
      appendRcmAudit("draft.denial", {
        userId: body.actor || "system",
        detail: { draftId: id, denialCode: body.denialCode },
      });
      return { ok: true, draft };
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- POST /rcm/claim-lifecycle/drafts/:id/resubmit -- resubmit ---- */
  server.post("/rcm/claim-lifecycle/drafts/:id/resubmit", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    try {
      const newDraft = await createResubmission(tenantId, id, body.actor || "system", body.overrides);
      if (!newDraft) return reply.code(404).send({ ok: false, error: "Draft not found" });
      appendRcmAudit("draft.resubmit", {
        userId: body.actor || "system",
        detail: { originalId: id, newDraftId: newDraft.id },
      });
      return reply.code(201).send({ ok: true, draft: newDraft });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- POST /rcm/claim-lifecycle/drafts/:id/appeal-packet ----------- */
  server.post("/rcm/claim-lifecycle/drafts/:id/appeal-packet", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.appealPacketRef) {
      return reply.code(400).send({ ok: false, error: "Missing appealPacketRef" });
    }
    const tenantId = body.tenantId || "default";
    try {
      const draft = await setAppealPacket(tenantId, id, body.appealPacketRef, body.actor || "system");
      if (!draft) return reply.code(404).send({ ok: false, error: "Draft not found" });
      appendRcmAudit("draft.appeal_packet", {
        userId: body.actor || "system",
        detail: { draftId: id, appealPacketRef: body.appealPacketRef },
      });
      return { ok: true, draft };
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- GET /rcm/claim-lifecycle/drafts/:id/events -- lifecycle events */
  server.get("/rcm/claim-lifecycle/drafts/:id/events", async (request, reply) => {
    const { id } = request.params as any;
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const events = await getLifecycleEvents(tenantId, id);
    return { ok: true, events, count: events.length };
  });

  /* -- GET /rcm/claim-lifecycle/drafts/:id/scrub-results ------------ */
  server.get("/rcm/claim-lifecycle/drafts/:id/scrub-results", async (request, reply) => {
    const { id } = request.params as any;
    const results = await getScrubResults(id);
    return { ok: true, results, count: results.length };
  });

  /* ================================================================ */
  /* Scrub Rules                                                       */
  /* ================================================================ */

  /* -- POST /rcm/claim-lifecycle/rules -- create rule --------------- */
  server.post("/rcm/claim-lifecycle/rules", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.ruleCode || !body.field || !body.description || !body.category) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required fields: ruleCode, field, description, category",
      });
    }
    // Hard rule: evidenceSource required -- no invented rules
    if (!body.evidenceSource) {
      return reply.code(400).send({
        ok: false,
        error: "evidenceSource is required. No invented rules. If unknown, use 'contracting_needed'.",
      });
    }
    try {
      const rule = await createScrubRule({
        tenantId: body.tenantId,
        payerId: body.payerId,
        serviceType: body.serviceType,
        ruleCode: body.ruleCode,
        category: body.category,
        severity: body.severity,
        field: body.field,
        description: body.description,
        condition: body.condition || {},
        suggestedFix: body.suggestedFix,
        evidenceSource: body.evidenceSource,
        evidenceDate: body.evidenceDate,
        blocksSubmission: body.blocksSubmission,
        createdBy: body.createdBy || "system",
      });
      appendRcmAudit("scrub_rule.created", {
        userId: body.createdBy || "system",
        detail: { ruleId: rule.id, ruleCode: rule.ruleCode },
      });
      return reply.code(201).send({ ok: true, rule });
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  /* -- GET /rcm/claim-lifecycle/rules -- list rules ----------------- */
  server.get("/rcm/claim-lifecycle/rules", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const rules = await listScrubRules(tenantId, {
      payerId: q.payerId,
      category: q.category,
      isActive: q.isActive === "false" ? false : true,
    });
    return { ok: true, rules, count: rules.length };
  });

  /* -- GET /rcm/claim-lifecycle/rules/:id -- get rule --------------- */
  server.get("/rcm/claim-lifecycle/rules/:id", async (request, reply) => {
    const { id } = request.params as any;
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const rule = await getScrubRuleById(tenantId, id);
    if (!rule) return reply.code(404).send({ ok: false, error: "Rule not found" });
    return { ok: true, rule };
  });

  /* -- PATCH /rcm/claim-lifecycle/rules/:id -- update rule ---------- */
  server.patch("/rcm/claim-lifecycle/rules/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    const rule = await updateScrubRule(tenantId, id, {
      description: body.description,
      condition: body.condition,
      suggestedFix: body.suggestedFix,
      severity: body.severity,
      blocksSubmission: body.blocksSubmission,
      evidenceSource: body.evidenceSource,
      evidenceDate: body.evidenceDate,
      isActive: body.isActive,
    });
    if (!rule) return reply.code(404).send({ ok: false, error: "Rule not found" });
    appendRcmAudit("scrub_rule.updated", {
      userId: body.actor || "system",
      detail: { ruleId: id },
    });
    return { ok: true, rule };
  });

  /* -- DELETE /rcm/claim-lifecycle/rules/:id -- delete rule ---------- */
  server.delete("/rcm/claim-lifecycle/rules/:id", async (request, reply) => {
    const { id } = request.params as any;
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const ok = await deleteScrubRule(tenantId, id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Rule not found" });
    appendRcmAudit("scrub_rule.deleted", {
      userId: (q as any).actor || "system",
      detail: { ruleId: id },
    });
    return { ok: true };
  });

  /* ================================================================ */
  /* Metrics                                                           */
  /* ================================================================ */

  /* -- GET /rcm/claim-lifecycle/metrics -- draft metrics ------------ */
  server.get("/rcm/claim-lifecycle/metrics", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const stats = await getClaimDraftStats(tenantId);

    // Compute first-pass rate and days-to-payment from stats
    const submittedCount = (stats.byStatus["submitted"] ?? 0) +
      (stats.byStatus["accepted"] ?? 0) +
      (stats.byStatus["paid"] ?? 0) +
      (stats.byStatus["denied"] ?? 0) +
      (stats.byStatus["rejected"] ?? 0);
    const paidCount = stats.byStatus["paid"] ?? 0;
    const firstPassRate = submittedCount > 0
      ? Math.round(((paidCount) / submittedCount) * 1000) / 10
      : null;

    return {
      ok: true,
      metrics: {
        total: stats.total,
        byStatus: stats.byStatus,
        deniedCount: stats.deniedCount,
        avgScrubScore: stats.avgScrubScore,
        totalChargeCents: stats.totalChargeCents,
        totalPaidCents: stats.totalPaidCents,
        firstPassRate,
        netCollectionRate: stats.totalChargeCents > 0
          ? Math.round((stats.totalPaidCents / stats.totalChargeCents) * 1000) / 10
          : null,
      },
    };
  });

  /* -- GET /rcm/claim-lifecycle/metrics/scrub -- scrub metrics ------ */
  server.get("/rcm/claim-lifecycle/metrics/scrub", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const metrics = await getScrubDashboardMetrics(tenantId);
    return { ok: true, metrics };
  });
};

export default claimLifecycleRoutes;
