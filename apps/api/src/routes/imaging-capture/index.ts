/**
 * Imaging Capture Routes -- Phase 538: SIC-like browser capture + attach
 *
 * Endpoints:
 *   POST /imaging/capture             -- Upload image, store to Orthanc, create record
 *   GET  /imaging/capture?dfn=N       -- List capture attachments for patient
 *   GET  /imaging/capture/:id         -- Detail of a capture attachment
 *   POST /imaging/capture/:id/link    -- Link attachment to VistA note/consult/order
 *
 * Auth: session-based (/imaging/* matches imaging auth rules).
 * VistA RPCs: MAG4 ADD IMAGE (integration-pending in sandbox).
 * Orthanc: POST /instances for non-DICOM file storage.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { log } from "../../lib/logger.js";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type AttachToType = "note" | "consult" | "order" | "none";
type CaptureStatus = "captured" | "attached" | "filed";

interface CaptureAttachment {
  id: string;
  dfn: string;
  capturedByDuz: string;
  capturedAt: string;
  mimeType: string;
  originalFilename: string;
  fileSize: number;
  orthancId: string | null;
  studyInstanceUid: string | null;
  attachedToType: AttachToType;
  attachedToId: string | null;
  vistaImageIen: string | null;
  status: CaptureStatus;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* In-memory stores                                                    */
/* ------------------------------------------------------------------ */

const captureStore = new Map<string, CaptureAttachment>();
const patientCaptureIndex = new Map<string, string[]>();

/* ------------------------------------------------------------------ */
/* Orthanc config (reuse env vars from imaging-proxy)                  */
/* ------------------------------------------------------------------ */

function getOrthancUrl(): string {
  return process.env.ORTHANC_URL || "http://localhost:8042";
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function imagingCaptureRoutes(server: FastifyInstance) {
  log.info("Imaging Capture routes registered (Phase 538)");

  /* ------------------------------------------------------------ */
  /* POST /imaging/capture -- Upload + create capture record       */
  /* ------------------------------------------------------------ */
  server.post("/imaging/capture", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const {
      dfn,
      filename,
      mimeType,
      fileBase64,
      notes: captureNotes,
    } = body as {
      dfn?: string;
      filename?: string;
      mimeType?: string;
      fileBase64?: string;
      notes?: string;
    };

    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn" });
    }
    if (!filename || !mimeType || !fileBase64) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required fields: filename, mimeType, fileBase64",
      });
    }

    const duz = (session as any).duz || "unknown";
    const fileBuffer = Buffer.from(fileBase64, "base64");

    // Attempt to store in Orthanc (if available)
    let orthancId: string | null = null;
    let orthancError: string | null = null;
    try {
      const resp = await fetch(`${getOrthancUrl()}/instances`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: fileBuffer,
      });
      if (resp.ok) {
        const result = (await resp.json()) as any;
        orthancId = result.ID || null;
        log.info(`Imaging capture stored to Orthanc: ${orthancId}`);
      } else {
        orthancError = `Orthanc returned ${resp.status}`;
        log.warn(`Imaging capture: Orthanc store failed: ${orthancError}`);
      }
    } catch (err: any) {
      orthancError = err.message;
      log.warn(`Imaging capture: Orthanc unavailable: ${orthancError}`);
    }

    // Create capture record
    const capture: CaptureAttachment = {
      id: randomUUID(),
      dfn,
      capturedByDuz: duz,
      capturedAt: new Date().toISOString(),
      mimeType,
      originalFilename: filename,
      fileSize: fileBuffer.length,
      orthancId,
      studyInstanceUid: null,
      attachedToType: "none",
      attachedToId: null,
      vistaImageIen: null,
      status: "captured",
      notes: captureNotes || "",
    };

    captureStore.set(capture.id, capture);
    const existing = patientCaptureIndex.get(dfn) || [];
    existing.push(capture.id);
    patientCaptureIndex.set(dfn, existing);

    return reply.code(201).send({
      ok: true,
      capture,
      orthancStored: !!orthancId,
      orthancError,
      vistaFiled: false,
      vistaGrounding: {
        vistaFiles: ["File 2005 (Image)", "File 2005.1 (Image Audit)"],
        targetRpcs: ["MAG4 ADD IMAGE", "MAG NEW SO ENTRY"],
        migrationPath: "1) Wrap file as DICOM SC, 2) Call MAG4 ADD IMAGE with patient/note context, 3) Store IEN in vistaImageIen",
        sandboxNote: "MAG4 ADD IMAGE not available in WorldVistA Docker. File stored to Orthanc only.",
      },
    });
  });

  /* ------------------------------------------------------------ */
  /* GET /imaging/capture?dfn=N -- List captures for patient       */
  /* ------------------------------------------------------------ */
  server.get("/imaging/capture", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { dfn } = request.query as { dfn?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn query parameter" });
    }

    const ids = patientCaptureIndex.get(dfn) || [];
    const captures = ids.map((id) => captureStore.get(id)).filter(Boolean);

    return {
      ok: true,
      count: captures.length,
      captures,
    };
  });

  /* ------------------------------------------------------------ */
  /* GET /imaging/capture/:id -- Capture detail                    */
  /* ------------------------------------------------------------ */
  server.get("/imaging/capture/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const capture = captureStore.get(id);
    if (!capture) {
      return reply.code(404).send({ ok: false, error: `Capture not found: ${id}` });
    }

    return { ok: true, capture };
  });

  /* ------------------------------------------------------------ */
  /* POST /imaging/capture/:id/link -- Link to note/consult/order  */
  /* ------------------------------------------------------------ */
  server.post("/imaging/capture/:id/link", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { attachToType, attachToId } = body as {
      attachToType?: AttachToType;
      attachToId?: string;
    };

    if (!attachToType || !attachToId) {
      return reply.code(400).send({
        ok: false,
        error: "Missing attachToType and attachToId",
      });
    }

    if (!["note", "consult", "order"].includes(attachToType)) {
      return reply.code(400).send({
        ok: false,
        error: "attachToType must be note, consult, or order",
      });
    }

    const capture = captureStore.get(id);
    if (!capture) {
      return reply.code(404).send({ ok: false, error: `Capture not found: ${id}` });
    }

    if (capture.status === "filed") {
      return reply.code(409).send({ ok: false, error: "Already filed to VistA" });
    }

    // Update local record
    capture.attachedToType = attachToType;
    capture.attachedToId = attachToId;
    capture.status = "attached";

    // VistA writeback is integration-pending
    return {
      ok: true,
      status: "attached-locally",
      capture,
      vistaFiled: false,
      vistaGrounding: {
        vistaFiles: ["File 2005 (Image)", "File 8925 (TIU Document)", "File 123 (Consultation)"],
        targetRpcs: [
          "MAG4 ADD IMAGE",
          attachToType === "note" ? "TIU ID ATTACH ENTRY" : "ORQQCN ATTACH MED RESULTS",
        ],
        migrationPath: `1) Ensure image in ^MAG(2005), 2) Call ${attachToType === "note" ? "TIU ID ATTACH ENTRY" : "ORQQCN ATTACH MED RESULTS"} to link, 3) Update vistaImageIen`,
        sandboxNote: "VistA attachment RPCs not wired in sandbox. Link tracked locally.",
      },
    };
  });
}
