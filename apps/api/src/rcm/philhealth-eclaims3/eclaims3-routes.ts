/**
 * PhilHealth eClaims 3.0 — API Routes
 *
 * Phase 96: Fastify plugin exposing the eClaims 3.0 adapter skeleton.
 *
 * Route prefix: /rcm/eclaims3/*
 * Auth: session-level via /rcm/ catch-all in security.ts AUTH_RULES.
 *
 * Endpoints:
 *   GET  /rcm/eclaims3/status          — Adapter status + spec gates
 *   POST /rcm/eclaims3/packets         — Build ClaimPacket from draft ID
 *   GET  /rcm/eclaims3/packets/:id     — Get a built packet
 *   POST /rcm/eclaims3/packets/:id/export — Generate export bundle
 *   GET  /rcm/eclaims3/submissions     — List submission records
 *   GET  /rcm/eclaims3/submissions/:id — Get submission detail
 *   PUT  /rcm/eclaims3/submissions/:id/status — Transition status
 *   POST /rcm/eclaims3/submissions/:id/denial — Record denial reason
 *   POST /rcm/eclaims3/submissions/:id/acceptance — Record acceptance (TCN)
 *   POST /rcm/eclaims3/submissions/:id/note — Add staff note
 *   GET  /rcm/eclaims3/submissions/stats — Submission stats
 *   GET  /rcm/eclaims3/spec-gates      — Spec acquisition gate status
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getPhilHealthClaimDraft, getOrCreateFacilitySetup } from "../payerOps/philhealth-store.js";
import { buildClaimPacket, verifyPacketIntegrity } from "./packet-builder.js";
import { generateExportBundle } from "./export-generators.js";
import { placeholderXmlGenerator } from "./xml-generator.js";
import {
  createSubmission,
  getSubmission,
  getSubmissionByDraft,
  listSubmissions,
  transitionSubmission,
  recordExportBundle,
  recordDenialReason,
  recordAcceptance,
  addStaffNote,
  getSubmissionStats,
  isManualOnlyTransition,
} from "./submission-tracker.js";
import {
  SPEC_ACQUISITION_GATES,
  type ClaimPacket,
  type EClaimsSubmissionStatus,
  type ExportFormat,
} from "./types.js";

/* ── Packet Cache (in-memory) ───────────────────────────────── */

const packetCache = new Map<string, ClaimPacket>();
const exportCache = new Map<string, ReturnType<typeof generateExportBundle>>();

/* ── Plugin ─────────────────────────────────────────────────── */

export default async function eclaims3Routes(server: FastifyInstance): Promise<void> {
  /* ── GET /rcm/eclaims3/status ─────────────────────────────── */
  server.get("/rcm/eclaims3/status", async (_req: FastifyRequest, _reply: FastifyReply) => {
    return {
      ok: true,
      adapter: "philhealth-eclaims3",
      version: "3.0-skeleton",
      specAvailable: placeholderXmlGenerator.specAvailable,
      schemaVersion: placeholderXmlGenerator.schemaVersion,
      submissionMode: "manual_only",
      deadline: "2026-04-01",
      deprecationDate: "2026-03-31",
      message: "eClaims 3.0 adapter skeleton active. Automated submission pending spec acquisition.",
      stats: getSubmissionStats(),
    };
  });

  /* ── GET /rcm/eclaims3/spec-gates ─────────────────────────── */
  server.get("/rcm/eclaims3/spec-gates", async () => {
    const completed = SPEC_ACQUISITION_GATES.filter((g) => g.status === "completed").length;
    return {
      ok: true,
      gates: SPEC_ACQUISITION_GATES,
      progress: { completed, total: SPEC_ACQUISITION_GATES.length },
    };
  });

  /* ── POST /rcm/eclaims3/packets ───────────────────────────── */
  server.post("/rcm/eclaims3/packets", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const draftId = body.draftId as string;
    const actor = (body.actor as string) || "system";

    if (!draftId) {
      return reply.status(400).send({ ok: false, error: "draftId is required." });
    }

    // Get the Phase 90 claim draft
    const draft = getPhilHealthClaimDraft(draftId);
    if (!draft) {
      return reply.status(404).send({ ok: false, error: "Claim draft not found." });
    }

    // Get facility setup for codes
    const setup = getOrCreateFacilitySetup(draft.facilityId);
    const facilityCode = setup.facilityCode ?? "PENDING";
    const facilityName = setup.facilityName ?? "Facility Not Configured";
    const accreditationNumber = setup.accreditationNumber;

    const result = buildClaimPacket(draft, {
      facilityCode,
      facilityName,
      accreditationNumber,
      actor,
    });

    if (!result.ok || !result.packet) {
      return reply.status(422).send({ ok: false, errors: result.errors });
    }

    // Cache the built packet
    packetCache.set(result.packet.packetId, result.packet);

    // Create a submission record if one doesn't exist for this draft
    let submission = getSubmissionByDraft(draftId);
    if (!submission) {
      submission = createSubmission(result.packet, actor);
    }

    return {
      ok: true,
      packet: result.packet,
      submissionId: submission.id,
    };
  });

  /* ── GET /rcm/eclaims3/packets/:id ────────────────────────── */
  server.get("/rcm/eclaims3/packets/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const packet = packetCache.get(id);
    if (!packet) {
      return reply.status(404).send({ ok: false, error: "Packet not found." });
    }

    return {
      ok: true,
      packet,
      integrityValid: verifyPacketIntegrity(packet),
    };
  });

  /* ── POST /rcm/eclaims3/packets/:id/export ────────────────── */
  server.post("/rcm/eclaims3/packets/:id/export", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const actor = (body.actor as string) || "system";
    const formats = (body.formats as ExportFormat[]) || undefined;

    const packet = packetCache.get(id);
    if (!packet) {
      return reply.status(404).send({ ok: false, error: "Packet not found." });
    }

    const bundle = generateExportBundle(packet, { formats, actor });
    exportCache.set(bundle.bundleId, bundle);

    // Link to submission if exists
    const submission = getSubmissionByDraft(packet.sourceClaimDraftId);
    if (submission) {
      recordExportBundle(submission.id, bundle.bundleId);
      // Auto-transition to "exported" if currently "reviewed"
      if (submission.status === "reviewed") {
        transitionSubmission(submission.id, "exported", actor, "Export bundle generated.");
      }
    }

    return {
      ok: true,
      bundle: {
        bundleId: bundle.bundleId,
        packetId: bundle.packetId,
        generatedAt: bundle.generatedAt,
        xmlSpecAvailable: bundle.xmlSpecAvailable,
        summary: bundle.summary,
        artifacts: bundle.artifacts.map((a) => ({
          format: a.format,
          filename: a.filename,
          contentType: a.contentType,
          sizeBytes: a.sizeBytes,
        })),
      },
    };
  });

  /* ── GET /rcm/eclaims3/submissions ────────────────────────── */
  server.get("/rcm/eclaims3/submissions", async (request: FastifyRequest) => {
    const query = request.query as Record<string, string>;
    const status = query.status as EClaimsSubmissionStatus | undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;

    const results = listSubmissions({ status, limit });
    return {
      ok: true,
      submissions: results,
      total: results.length,
    };
  });

  /* ── GET /rcm/eclaims3/submissions/stats ──────────────────── */
  server.get("/rcm/eclaims3/submissions/stats", async () => {
    return { ok: true, ...getSubmissionStats() };
  });

  /* ── GET /rcm/eclaims3/submissions/:id ────────────────────── */
  server.get("/rcm/eclaims3/submissions/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const submission = getSubmission(id);
    if (!submission) {
      return reply.status(404).send({ ok: false, error: "Submission not found." });
    }
    return { ok: true, submission };
  });

  /* ── PUT /rcm/eclaims3/submissions/:id/status ─────────────── */
  server.put("/rcm/eclaims3/submissions/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const toStatus = body.status as EClaimsSubmissionStatus;
    const actor = (body.actor as string) || "system";
    const detail = body.detail as string | undefined;

    if (!toStatus) {
      return reply.status(400).send({ ok: false, error: "status is required." });
    }

    // Guard: transitions to accepted/denied require staff confirmation
    if (isManualOnlyTransition(toStatus)) {
      const confirmation = body.staffConfirmation as boolean;
      if (!confirmation) {
        return reply.status(400).send({
          ok: false,
          error: `Status '${toStatus}' requires staffConfirmation: true — this is a manual-only transition.`,
        });
      }
    }

    const result = transitionSubmission(id, toStatus, actor, detail);
    if (!result.ok) {
      return reply.status(422).send(result);
    }

    return { ok: true, submission: result.submission };
  });

  /* ── POST /rcm/eclaims3/submissions/:id/denial ────────────── */
  server.post("/rcm/eclaims3/submissions/:id/denial", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const text = body.text as string;
    const code = body.code as string | undefined;
    const category = body.category as DenialCategory | undefined;
    const recordedBy = (body.actor as string) || "staff";

    if (!text) {
      return reply.status(400).send({ ok: false, error: "Denial reason text is required." });
    }

    const result = recordDenialReason(id, { text, code, category, recordedBy });
    if (!result.ok) {
      return reply.status(422).send(result);
    }

    return { ok: true, submission: result.submission };
  });

  /* ── POST /rcm/eclaims3/submissions/:id/acceptance ─────────── */
  server.post("/rcm/eclaims3/submissions/:id/acceptance", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const tcn = body.transmittalControlNumber as string;
    const payerRefNumber = body.payerRefNumber as string | undefined;

    if (!tcn) {
      return reply.status(400).send({
        ok: false,
        error: "transmittalControlNumber is required — enter the TCN from PhilHealth.",
      });
    }

    const result = recordAcceptance(id, tcn, payerRefNumber);
    if (!result.ok) {
      return reply.status(422).send(result);
    }

    return { ok: true, submission: result.submission };
  });

  /* ── POST /rcm/eclaims3/submissions/:id/note ──────────────── */
  server.post("/rcm/eclaims3/submissions/:id/note", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const note = body.note as string;

    if (!note) {
      return reply.status(400).send({ ok: false, error: "Note text is required." });
    }

    const added = addStaffNote(id, note);
    if (!added) {
      return reply.status(404).send({ ok: false, error: "Submission not found." });
    }

    return { ok: true };
  });
}

/* ── Type helper for denial category ────────────────────────── */
type DenialCategory = "documentation" | "eligibility" | "coding" | "timely_filing" | "other";
