/**
 * Imaging Worklist Service — Phase 23.
 *
 * Provides a modality worklist backed by imaging orders.
 * V1 uses an in-memory sidecar store. Designed for migration to:
 *   - VistA Radiology RPCs (ORWDXR*, RAD*) when available
 *   - DICOM Modality Worklist (MWL) C-FIND via Orthanc plugin
 *
 * Routes:
 *   GET  /imaging/worklist              — list worklist items (filterable)
 *   POST /imaging/worklist/orders       — create imaging order → worklist item
 *   GET  /imaging/worklist/:id          — single worklist item detail
 *   PATCH /imaging/worklist/:id/status  — update item status
 *   GET  /imaging/worklist/stats        — worklist statistics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

/** Order/worklist item status lifecycle. */
export type WorklistItemStatus =
  | "ordered"       // Provider placed the order
  | "scheduled"     // Scheduled for a date/time
  | "in-progress"   // Patient checked in / modality acquired
  | "completed"     // Study received & linked
  | "cancelled"     // Order cancelled
  | "discontinued"; // Order discontinued

/** A single worklist item representing an imaging order. */
export interface WorklistItem {
  id: string;
  /** VistA order IEN (if created via VistA) — null for prototype orders */
  vistaOrderId: string | null;
  /** Patient DFN in VistA */
  patientDfn: string;
  /** Patient name (denormalized for worklist display) */
  patientName: string;
  /** Accession number — unique per order, used for DICOM reconciliation */
  accessionNumber: string;
  /** Ordered procedure description */
  scheduledProcedure: string;
  /** Radiology procedure code (CPT or internal) */
  procedureCode: string | null;
  /** Target modality (CT, MR, CR, US, XA, etc.) */
  modality: string;
  /** Scheduled date/time (ISO 8601) */
  scheduledTime: string;
  /** Facility/location identifier */
  facility: string;
  /** Imaging location (e.g., "Radiology Room 1") */
  location: string;
  /** Ordering provider DUZ */
  orderingProviderDuz: string;
  /** Ordering provider name */
  orderingProviderName: string;
  /** Clinical indication / reason for exam */
  clinicalIndication: string;
  /** Priority: routine, stat, urgent */
  priority: "routine" | "stat" | "urgent";
  /** Current status */
  status: WorklistItemStatus;
  /** Linked study UID (set after DICOM ingest reconciliation) */
  linkedStudyUid: string | null;
  /** Linked Orthanc study ID (set after reconciliation) */
  linkedOrthancStudyId: string | null;
  /** Source label — "prototype-sidecar" or "vista-radiology" */
  source: "prototype-sidecar" | "vista-radiology";
  /** Created timestamp (ISO 8601) */
  createdAt: string;
  /** Last updated timestamp (ISO 8601) */
  updatedAt: string;
}

/** Input for creating a new imaging order. */
export interface CreateImagingOrderInput {
  patientDfn: string;
  patientName?: string;
  scheduledProcedure: string;
  procedureCode?: string;
  modality: string;
  scheduledTime?: string;
  facility?: string;
  location?: string;
  clinicalIndication?: string;
  priority?: "routine" | "stat" | "urgent";
}

/* ================================================================== */
/* In-Memory Sidecar Store (prototype — migrate to VistA #2005/RAD)    */
/* ================================================================== */

/**
 * PROTOTYPE ORDER SOURCE — Phase 23 sidecar.
 *
 * Migration plan:
 * 1. When VistA Radiology RPCs (ORWDXR NEW ORDER, RAD/NUC MED REGISTER)
 *    are available, replace createOrder() with VistA RPC calls.
 * 2. When DICOM MWL C-FIND is configured via Orthanc worklist plugin,
 *    getWorklist() should merge VistA orders + MWL results.
 * 3. Target VistA file: ^RAD(75.1) Rad/Nuc Med Orders.
 * 4. Accession number generation should eventually come from VistA
 *    (file #74, RA MASTER ACCESSION NUMBER).
 */
const worklistStore = new Map<string, WorklistItem>();

/** Counter for prototype accession numbers. */
let accessionCounter = 1000;

/** Generate a prototype accession number (format: VE-YYYYMMDD-NNNN). */
function generateAccessionNumber(): string {
  const d = new Date();
  const ds = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `VE-${ds}-${String(++accessionCounter).padStart(4, "0")}`;
}

/* ================================================================== */
/* Store operations                                                    */
/* ================================================================== */

export function getWorklistItem(id: string): WorklistItem | undefined {
  return worklistStore.get(id);
}

export function findByAccession(accessionNumber: string): WorklistItem | undefined {
  for (const item of worklistStore.values()) {
    if (item.accessionNumber === accessionNumber) return item;
  }
  return undefined;
}

export function findByPatientDfn(dfn: string): WorklistItem[] {
  return [...worklistStore.values()].filter((w) => w.patientDfn === dfn);
}

export function updateWorklistItem(id: string, updates: Partial<WorklistItem>): WorklistItem | undefined {
  const item = worklistStore.get(id);
  if (!item) return undefined;
  const updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
  worklistStore.set(id, updated);
  return updated;
}

export function getAllWorklistItems(): WorklistItem[] {
  return [...worklistStore.values()];
}

/* ================================================================== */
/* VistA RPC stubs — migration targets                                 */
/* ================================================================== */

/**
 * Target RPCs for VistA Radiology ordering (when sandbox supports them):
 *
 * - ORWDXR NEW ORDER      — Create a new radiology order
 * - ORWDXR ISREL          — Check if order is released
 * - RAD/NUC MED REGISTER  — Register exam in Radiology package
 * - RARTE EXAMS BY DFN    — List radiology exams for patient
 * - RA DETAILED REPORT    — Get radiology report text
 * - MAGG PAT PHOTOS       — Patient photos (Phase 22 wired)
 * - MAG4 PAT GET IMAGES   — Patient image list (Phase 22 wired)
 * - MAG4 REMOTE PROCEDURE — Imaging metadata (Phase 22 wired)
 *
 * File numbers:
 * - ^RAD(75.1)  — Rad/Nuc Med Orders
 * - ^RA(74)     — Rad/Nuc Med Master Accession
 * - ^MAG(2005)  — Image entry (VistA Imaging)
 * - ^MAG(2005.1) — Image Group
 */

/* ================================================================== */
/* Route definitions                                                   */
/* ================================================================== */

export default async function imagingWorklistRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /imaging/worklist — List worklist items.
   * Query params: facility, modality, date (YYYY-MM-DD), status, patientDfn
   */
  server.get("/imaging/worklist", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const q = request.query as Record<string, string>;
    let items = getAllWorklistItems();

    // Filters
    if (q.facility) items = items.filter((i) => i.facility === q.facility);
    if (q.modality) items = items.filter((i) => i.modality.toUpperCase() === q.modality.toUpperCase());
    if (q.status) items = items.filter((i) => i.status === q.status);
    if (q.patientDfn) items = items.filter((i) => i.patientDfn === q.patientDfn);
    if (q.date) {
      items = items.filter((i) => i.scheduledTime.startsWith(q.date));
    }
    if (q.priority) items = items.filter((i) => i.priority === q.priority);

    // Sort by scheduled time (soonest first), stat orders first
    items.sort((a, b) => {
      if (a.priority === "stat" && b.priority !== "stat") return -1;
      if (b.priority === "stat" && a.priority !== "stat") return 1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    audit("imaging.worklist-view", "success", {
      duz: session.duz, name: session.userName, role: session.role,
    }, {
      sourceIp: request.ip,
      detail: { filters: q, resultCount: items.length },
    });

    return {
      ok: true,
      source: "prototype-sidecar",
      migrationTarget: "VistA Radiology RPCs (ORWDXR*, RAD/NUC MED)",
      count: items.length,
      items,
    };
  });

  /**
   * POST /imaging/worklist/orders — Create an imaging order.
   * Body: CreateImagingOrderInput
   */
  server.post("/imaging/worklist/orders", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const body = request.body as CreateImagingOrderInput;

    // Validate required fields
    if (!body?.patientDfn || !body?.scheduledProcedure || !body?.modality) {
      reply.code(400).send({
        ok: false,
        error: "Missing required fields: patientDfn, scheduledProcedure, modality",
      });
      return;
    }

    const validModalities = ["CR", "CT", "MR", "US", "XA", "NM", "PT", "MG", "DX", "RF", "OT"];
    const mod = body.modality.toUpperCase();
    if (!validModalities.includes(mod)) {
      reply.code(400).send({
        ok: false,
        error: `Invalid modality '${body.modality}'. Valid: ${validModalities.join(", ")}`,
      });
      return;
    }

    const now = new Date().toISOString();
    const item: WorklistItem = {
      id: randomUUID(),
      vistaOrderId: null, // Prototype — no VistA order IEN
      patientDfn: body.patientDfn,
      patientName: body.patientName || `Patient DFN ${body.patientDfn}`,
      accessionNumber: generateAccessionNumber(),
      scheduledProcedure: body.scheduledProcedure,
      procedureCode: body.procedureCode || null,
      modality: mod,
      scheduledTime: body.scheduledTime || now,
      facility: body.facility || "DEFAULT",
      location: body.location || "Radiology",
      orderingProviderDuz: session.duz,
      orderingProviderName: session.userName || "Unknown Provider",
      clinicalIndication: body.clinicalIndication || "",
      priority: body.priority || "routine",
      status: "ordered",
      linkedStudyUid: null,
      linkedOrthancStudyId: null,
      source: "prototype-sidecar",
      createdAt: now,
      updatedAt: now,
    };

    worklistStore.set(item.id, item);

    log.info("Imaging order created", {
      orderId: item.id,
      accession: item.accessionNumber,
      patientDfn: item.patientDfn,
      modality: item.modality,
    });

    audit("imaging.order-create", "success", {
      duz: session.duz, name: session.userName, role: session.role,
    }, {
      patientDfn: body.patientDfn,
      sourceIp: request.ip,
      detail: {
        orderId: item.id,
        accession: item.accessionNumber,
        modality: item.modality,
        procedure: item.scheduledProcedure,
      },
    });

    reply.code(201).send({
      ok: true,
      source: "prototype-sidecar",
      order: item,
    });
  });

  /**
   * GET /imaging/worklist/:id — Single worklist item detail.
   */
  server.get("/imaging/worklist/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const { id } = request.params as { id: string };
    const item = getWorklistItem(id);
    if (!item) {
      reply.code(404).send({ ok: false, error: "Worklist item not found" });
      return;
    }

    return { ok: true, item };
  });

  /**
   * PATCH /imaging/worklist/:id/status — Update worklist item status.
   * Body: { status: WorklistItemStatus }
   */
  server.patch("/imaging/worklist/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const { id } = request.params as { id: string };
    const body = request.body as { status?: string };

    const validStatuses: WorklistItemStatus[] = [
      "ordered", "scheduled", "in-progress", "completed", "cancelled", "discontinued",
    ];
    if (!body?.status || !validStatuses.includes(body.status as WorklistItemStatus)) {
      reply.code(400).send({
        ok: false,
        error: `Invalid status. Valid: ${validStatuses.join(", ")}`,
      });
      return;
    }

    const item = updateWorklistItem(id, { status: body.status as WorklistItemStatus });
    if (!item) {
      reply.code(404).send({ ok: false, error: "Worklist item not found" });
      return;
    }

    log.info("Worklist item status updated", {
      orderId: id,
      newStatus: body.status,
    });

    audit("imaging.order-status-change", "success", {
      duz: session.duz, name: session.userName, role: session.role,
    }, {
      patientDfn: item.patientDfn,
      sourceIp: request.ip,
      detail: { orderId: id, newStatus: body.status },
    });

    return { ok: true, item };
  });

  /**
   * GET /imaging/worklist/stats — Worklist statistics.
   */
  server.get("/imaging/worklist/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const items = getAllWorklistItems();
    const byStatus: Record<string, number> = {};
    const byModality: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byModality[item.modality] = (byModality[item.modality] || 0) + 1;
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
    }

    return {
      ok: true,
      total: items.length,
      linked: items.filter((i) => i.linkedStudyUid !== null).length,
      unlinked: items.filter((i) => i.linkedStudyUid === null && i.status !== "cancelled" && i.status !== "discontinued").length,
      byStatus,
      byModality,
      byPriority,
    };
  });
}
