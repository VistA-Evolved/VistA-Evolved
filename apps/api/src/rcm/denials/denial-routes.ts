/**
 * Denial & Appeals API Routes — Phase 98
 *
 * Endpoints:
 *   GET  /rcm/denials             — Paginated denial list (work queue)
 *   POST /rcm/denials             — Create denial case (manual intake)
 *   GET  /rcm/denials/stats       — Dashboard stats by status
 *   GET  /rcm/denials/:id         — Get denial with actions
 *   PATCH /rcm/denials/:id        — Update denial (status transition, assignment, codes)
 *   POST /rcm/denials/:id/actions — Add action to denial
 *   GET  /rcm/denials/:id/actions — List actions for denial
 *   POST /rcm/denials/:id/attachments — Add attachment reference
 *   GET  /rcm/denials/:id/attachments — List attachments
 *   POST /rcm/denials/:id/appeal-packet — Generate appeal packet HTML
 *   POST /rcm/denials/:id/resubmit    — Create resubmission attempt
 *   GET  /rcm/denials/:id/resubmissions — List resubmissions
 *   POST /rcm/denials/import/835      — Batch import from 835 remittance
 *
 * All routes under /rcm/ — existing security catch-all covers session auth.
 * Mutations wired to appendRcmAudit.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createDenialCase,
  getDenialById,
  updateDenialCase,
  listDenials,
  addDenialAction,
  listDenialActions,
  addAttachment,
  listAttachments,
  createResubmission,
  listResubmissions,
  getDenialStats,
} from "./denial-store.js";
import { generateAppealPacket, generateAppealPacketHtml } from "./appeal-packet.js";
import { importRemittanceDenials } from "./edi-import.js";
import { appendRcmAudit } from "../audit/rcm-audit.js";
import {
  CreateDenialSchema,
  UpdateDenialSchema,
  DenialListQuerySchema,
  CreateDenialActionSchema,
  CreateResubmissionSchema,
  Import835BatchSchema,
  isValidDenialTransition,
} from "./types.js";
import type { DenialStatus } from "./types.js";

/* ── Session helper ────────────────────────────────────────── */

function getSession(request: FastifyRequest): { duz: string; tenantId: string } {
  const s = (request as any).session;
  return {
    duz: s?.duz ?? "system",
    tenantId: s?.tenantId ?? "default",
  };
}

/* ── Route Registration ────────────────────────────────────── */

export default async function denialRoutes(server: FastifyInstance): Promise<void> {

  /* ── List Denials (Work Queue) ─────────────────────────── */
  server.get("/rcm/denials", async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const parsed = DenialListQuerySchema.safeParse(q);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.issues });
    }
    const result = await listDenials(parsed.data);
    return reply.send({ ok: true, ...result });
  });

  /* ── Create Denial (Manual Intake) ─────────────────────── */
  server.post("/rcm/denials", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const parsed = CreateDenialSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.issues });
    }
    const { duz } = getSession(request);
    const denial = await createDenialCase(parsed.data, duz);

    appendRcmAudit("denial.created", {
      claimId: denial.claimRef,
      payerId: denial.payerId,
      userId: duz,
      detail: { denialId: denial.id, source: denial.denialSource },
    });

    return reply.status(201).send({ ok: true, denial });
  });

  /* ── Dashboard Stats ───────────────────────────────────── */
  server.get("/rcm/denials/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    const stats = await getDenialStats();
    return reply.send({ ok: true, stats });
  });

  /* ── Get Denial Detail ─────────────────────────────────── */
  server.get("/rcm/denials/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }
    const actions = await listDenialActions(id);
    const attachments = await listAttachments(id);
    const resubmissions = await listResubmissions(id);
    return reply.send({ ok: true, denial, actions, attachments, resubmissions });
  });

  /* ── Update Denial ─────────────────────────────────────── */
  server.patch("/rcm/denials/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const parsed = UpdateDenialSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.issues });
    }

    // Validate transition if status change
    if (parsed.data.denialStatus) {
      const existing = await getDenialById(id);
      if (!existing) {
        return reply.status(404).send({ ok: false, error: "Denial not found" });
      }
      if (!isValidDenialTransition(existing.denialStatus, parsed.data.denialStatus)) {
        return reply.status(400).send({
          ok: false,
          error: `Invalid transition: ${existing.denialStatus} → ${parsed.data.denialStatus}`,
        });
      }
    }

    const { duz } = getSession(request);
    const { reason, ...updates } = parsed.data;
    const denial = await updateDenialCase(id, updates, duz, reason);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }

    // Map status to audit action
    const auditAction = mapStatusToAuditAction(parsed.data.denialStatus);
    appendRcmAudit(auditAction, {
      claimId: denial.claimRef,
      payerId: denial.payerId,
      userId: duz,
      detail: { denialId: denial.id, reason, newStatus: denial.denialStatus },
    });

    return reply.send({ ok: true, denial });
  });

  /* ── Add Action ────────────────────────────────────────── */
  server.post("/rcm/denials/:id/actions", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const parsed = CreateDenialActionSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.issues });
    }

    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }

    const { duz } = getSession(request);
    const payload = { ...parsed.data.payload };
    if (parsed.data.note) payload.note = parsed.data.note;

    const action = await addDenialAction(id, duz, parsed.data.actionType, payload);

    appendRcmAudit("denial.action_added", {
      claimId: denial.claimRef,
      payerId: denial.payerId,
      userId: duz,
      detail: { denialId: id, actionType: parsed.data.actionType },
    });

    return reply.status(201).send({ ok: true, action });
  });

  /* ── List Actions ──────────────────────────────────────── */
  server.get("/rcm/denials/:id/actions", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }
    const actions = await listDenialActions(id);
    return reply.send({ ok: true, actions });
  });

  /* ── Add Attachment Reference ──────────────────────────── */
  server.post("/rcm/denials/:id/attachments", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    if (!body.label || !body.refType) {
      return reply.status(400).send({ ok: false, error: "label and refType required" });
    }

    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }

    const { duz } = getSession(request);
    const attachment = await addAttachment(
      id,
      body.label,
      body.refType,
      body.storedPath ?? null,
      body.sha256 ?? null,
      duz,
    );

    appendRcmAudit("denial.attachment_added", {
      claimId: denial.claimRef,
      payerId: denial.payerId,
      userId: duz,
      detail: { denialId: id, attachmentId: attachment.id, label: body.label },
    });

    return reply.status(201).send({ ok: true, attachment });
  });

  /* ── List Attachments ──────────────────────────────────── */
  server.get("/rcm/denials/:id/attachments", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }
    const attachments = await listAttachments(id);
    return reply.send({ ok: true, attachments });
  });

  /* ── Generate Appeal Packet ────────────────────────────── */
  server.post("/rcm/denials/:id/appeal-packet", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }

    const { duz } = getSession(request);
    const body = (request.body as any) || {};
    const format = body.format ?? "json"; // "json" | "html"

    const actions = await listDenialActions(id);
    const attachments = await listAttachments(id);
    const payerName = denial.payerId; // TODO: resolve from payer registry
    const packet = generateAppealPacket(denial, actions, attachments, payerName);

    // Record packet generation as action
    await addDenialAction(id, duz, "GENERATE_APPEAL_PACKET", {
      format,
      generatedAt: packet.generatedAt,
    });

    appendRcmAudit("denial.packet_generated", {
      claimId: denial.claimRef,
      payerId: denial.payerId,
      userId: duz,
      detail: { denialId: id, format },
    });

    if (format === "html") {
      const html = generateAppealPacketHtml(denial, actions, attachments, payerName);
      return reply.type("text/html").send(html);
    }

    return reply.send({ ok: true, packet });
  });

  /* ── Create Resubmission ───────────────────────────────── */
  server.post("/rcm/denials/:id/resubmit", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const parsed = CreateResubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.issues });
    }

    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }

    const { duz } = getSession(request);
    const resub = await createResubmission(
      id,
      parsed.data.method,
      parsed.data.referenceNumber ?? null,
      parsed.data.followUpDate ?? null,
      parsed.data.notes ?? null,
      duz,
    );

    // Transition to RESUBMITTED if currently APPEALING or TRIAGED
    if (denial.denialStatus === "APPEALING" || denial.denialStatus === "TRIAGED") {
      await updateDenialCase(id, { denialStatus: "RESUBMITTED" as DenialStatus }, duz, "Resubmission created");
    }

    appendRcmAudit("denial.resubmitted", {
      claimId: denial.claimRef,
      payerId: denial.payerId,
      userId: duz,
      detail: { denialId: id, method: parsed.data.method, resubmissionId: resub.id },
    });

    return reply.status(201).send({ ok: true, resubmission: resub });
  });

  /* ── List Resubmissions ────────────────────────────────── */
  server.get("/rcm/denials/:id/resubmissions", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const denial = await getDenialById(id);
    if (!denial) {
      return reply.status(404).send({ ok: false, error: "Denial not found" });
    }
    const resubmissions = await listResubmissions(id);
    return reply.send({ ok: true, resubmissions });
  });

  /* ── Batch Import from 835 ────────────────────────────── */
  server.post("/rcm/denials/import/835", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const parsed = Import835BatchSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({ ok: false, error: parsed.error.issues });
    }

    const { duz } = getSession(request);
    const result = await importRemittanceDenials(parsed.data, duz);

    appendRcmAudit("denial.imported", {
      userId: duz,
      detail: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        importFileHash: result.importFileHash,
      },
    });

    const status = result.ok ? (result.errors.length > 0 ? 207 : 201) : 400;
    return reply.status(status).send(result);
  });
}

/* ── Helpers ───────────────────────────────────────────────── */

function mapStatusToAuditAction(status?: DenialStatus) {
  switch (status) {
    case "TRIAGED": return "denial.triaged" as const;
    case "APPEALING": return "denial.appealing" as const;
    case "RESUBMITTED": return "denial.resubmitted" as const;
    case "PAID": return "denial.resolved" as const;
    case "PARTIAL": return "denial.resolved" as const;
    case "WRITEOFF": return "denial.writeoff" as const;
    case "CLOSED": return "denial.closed" as const;
    default: return "denial.updated" as const;
  }
}
