/**
 * Imaging Ingest & Reconciliation Service — Phase 23.
 *
 * Handles DICOM study ingest callbacks from Orthanc and reconciles
 * incoming studies to imaging orders via AccessionNumber + PatientID.
 *
 * Architecture:
 *   Orthanc → OnStableStudy Lua → POST /imaging/ingest/callback → Reconcile
 *   Unmatched studies go to quarantine for manual linking.
 *
 * Routes:
 *   POST /imaging/ingest/callback              — Orthanc stable-study webhook
 *   GET  /imaging/ingest/unmatched              — Quarantine queue (admin)
 *   POST /imaging/ingest/unmatched/:id/link     — Manual reconciliation (admin)
 *   GET  /imaging/ingest/linkages               — All study-order linkages
 *   GET  /imaging/ingest/linkages/by-patient/:dfn — Linkages for a patient
 *
 * Auth: /imaging/ingest/callback uses X-Service-Key header.
 *       All other routes use session auth (admin role).
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";

/** Log DB persistence failures at warn level instead of silently swallowing. */
function dbWarn(op: string, err: unknown): void {
  log.warn(`imaging-ingest DB ${op} failed`, { error: String(err) });
}
import { IMAGING_CONFIG } from "../config/server-config.js";
import {
  findByAccession,
  findByPatientDfn,
  updateWorklistItem,
  getWorklistItem,
  type WorklistItem,
} from "./imaging-worklist.js";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

/** A study-to-order linkage record. */
export interface StudyLinkage {
  id: string;
  /** Worklist/order ID */
  orderId: string;
  /** Patient DFN */
  patientDfn: string;
  /** DICOM StudyInstanceUID */
  studyInstanceUid: string;
  /** Orthanc internal study ID */
  orthancStudyId: string;
  /** DICOM AccessionNumber used for matching */
  accessionNumber: string;
  /** DICOM modality (from study) */
  modality: string;
  /** Study date (YYYYMMDD from DICOM) */
  studyDate: string;
  /** Study description */
  studyDescription: string;
  /** Number of series in the study */
  seriesCount: number;
  /** Number of instances in the study */
  instanceCount: number;
  /** How the linkage was established */
  reconciliationType: "automatic-accession" | "automatic-patient-modality" | "manual";
  /** Source of linkage metadata — "prototype-sidecar" until VistA MAG is wired */
  source: "prototype-sidecar" | "vista-mag-2005";
  /** Timestamp of linkage creation */
  linkedAt: string;
}

/** An unmatched (quarantined) study. */
export interface UnmatchedStudy {
  id: string;
  /** Orthanc internal study ID */
  orthancStudyId: string;
  /** DICOM StudyInstanceUID */
  studyInstanceUid: string;
  /** PatientID from DICOM tags */
  dicomPatientId: string;
  /** PatientName from DICOM tags */
  dicomPatientName: string;
  /** AccessionNumber from DICOM tags */
  accessionNumber: string;
  /** Modality */
  modality: string;
  /** Study date */
  studyDate: string;
  /** Study description */
  studyDescription: string;
  /** Series count */
  seriesCount: number;
  /** Instance count */
  instanceCount: number;
  /** Reason reconciliation failed */
  reason: string;
  /** When the study was quarantined */
  quarantinedAt: string;
  /** Whether it has been resolved */
  resolved: boolean;
}

/** Orthanc OnStableStudy callback payload. */
interface OrthancStableStudyPayload {
  /** Orthanc resource type — always "study" */
  type?: string;
  /** Orthanc internal study ID */
  orthancStudyId: string;
  /** DICOM tags extracted by Orthanc (populated by our Lua script) */
  studyInstanceUid: string;
  patientId: string;
  patientName?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesCount?: number;
  instanceCount?: number;
}

/* ================================================================== */
/* DB repo -- lazy-wired after initPlatformDb() (Phase 115)            */
/* ================================================================== */

/** Repo interface -- accepts both SQLite (sync) and PG (async) repos. */
export interface IngestRepo {
  insertStudyLink(data: any): any;
  insertUnmatched(data: any): any;
  findStudyLinksForPatient(dfn: string): any;
  findStudyLinkByStudyUid(uid: string): any;
  findStudyLinkByOrderId(orderId: string): any;
  findAllStudyLinks(): any;
  findAllUnresolved(): any;
  findUnmatchedByStudyUid(uid: string): any;
  findUnmatchedById(id: string): any;
  resolveUnmatched(id: string): any;
}
let _repo: IngestRepo | null = null;

/** Wire the imaging ingest repo. Called from index.ts. */
export async function initIngestRepo(repo: IngestRepo): Promise<void> {
  _repo = repo;
  // Rehydrate caches from DB on startup (Phase 128)
  try {
    const rawLinks = await Promise.resolve(repo.findAllStudyLinks());
    const links = Array.isArray(rawLinks) ? rawLinks : [];
    for (const row of links) {
      const lnk = rowToLinkage(row);
      linkageCache.set(lnk.studyInstanceUid, lnk);
    }
    const rawUnmatched = await Promise.resolve(repo.findAllUnresolved());
    const unmatched = Array.isArray(rawUnmatched) ? rawUnmatched : [];
    for (const row of unmatched) {
      const um = rowToUnmatched(row);
      unmatchedCache.set(um.id, um);
    }
    const total = links.length + unmatched.length;
    if (total > 0) {
      log.info(`Imaging ingest rehydrated ${links.length} linkages + ${unmatched.length} unmatched from DB`);
    }
  } catch (err) {
    dbWarn("rehydrate", err);
  }
}

/* ================================================================== */
/* In-Memory Caches (prototype -- migrate to VistA ^MAG(2005))         */
/* ================================================================== */

/**
 * PROTOTYPE LINKAGE STORE -- Phase 23 sidecar.
 *
 * Migration plan:
 * 1. Target: VistA Image file ^MAG(2005) -- each entry links a DICOM
 *    study to a patient and optionally to an order/TIU note.
 * 2. Write linkage via MAG4 ADD IMAGE (if available) or direct
 *    FileMan SET on file 2005 via XWBFM.
 * 3. Read linkage via MAG4 PAT GET IMAGES / MAGG PAT PHOTOS
 *    (already wired in Phase 22).
 */
const linkageCache = new Map<string, StudyLinkage>();
const unmatchedCache = new Map<string, UnmatchedStudy>();

function rowToLinkage(row: any): StudyLinkage {
  return {
    id: row.id,
    orderId: row.orderId ?? "",
    patientDfn: row.patientDfn ?? "",
    studyInstanceUid: row.studyInstanceUid ?? "",
    orthancStudyId: row.orthancStudyId ?? "",
    accessionNumber: row.accessionNumber ?? "",
    modality: row.modality ?? "",
    studyDate: row.studyDate ?? "",
    studyDescription: row.studyDescription ?? "",
    seriesCount: row.seriesCount ?? 0,
    instanceCount: row.instanceCount ?? 0,
    reconciliationType: (row.reconciliationType ?? "manual") as StudyLinkage["reconciliationType"],
    source: (row.source ?? "prototype-sidecar") as StudyLinkage["source"],
    // PG rows use createdAt (no linkedAt column); SQLite/Map rows use linkedAt
    linkedAt: row.linkedAt ?? row.createdAt ?? "",
  };
}

function rowToUnmatched(row: any): UnmatchedStudy {
  return {
    id: row.id,
    orthancStudyId: row.orthancStudyId ?? "",
    studyInstanceUid: row.studyInstanceUid ?? "",
    // PG stores dicomPatientId in patientDfn column; SQLite/Map rows use dicomPatientId
    dicomPatientId: row.dicomPatientId ?? row.patientDfn ?? "",
    // PG stores dicomPatientName in its own column (v12+); fall back for older rows
    dicomPatientName: row.dicomPatientName ?? "",
    accessionNumber: row.accessionNumber ?? "",
    modality: row.modality ?? "",
    studyDate: row.studyDate ?? "",
    studyDescription: row.studyDescription ?? "",
    seriesCount: row.seriesCount ?? 0,
    instanceCount: row.instanceCount ?? 0,
    reason: row.reason ?? "",
    // PG rows use createdAt (no quarantinedAt column); SQLite/Map rows use quarantinedAt
    quarantinedAt: row.quarantinedAt ?? row.createdAt ?? "",
    resolved: row.resolved === 1 || row.resolved === true,
  };
}

/* ================================================================== */
/* Service key validation                                              */
/* ================================================================== */

function validateServiceKey(request: FastifyRequest): boolean {
  const key = request.headers["x-service-key"] as string | undefined;
  if (!key) return false;
  const expected = IMAGING_CONFIG.ingestWebhookSecret;
  if (!expected) {
    log.warn("IMAGING_INGEST_WEBHOOK_SECRET not configured — rejecting all ingest callbacks");
    return false;
  }
  // Constant-time comparison
  if (key.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < key.length; i++) {
    result |= key.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/* ================================================================== */
/* Reconciliation logic                                                */
/* ================================================================== */

interface ReconcileResult {
  matched: boolean;
  linkage?: StudyLinkage;
  unmatched?: UnmatchedStudy;
  matchType?: string;
}

async function reconcileStudy(payload: OrthancStableStudyPayload): Promise<ReconcileResult> {
  const { orthancStudyId: _orthancStudyId, studyInstanceUid, patientId, accessionNumber, modality } = payload;

  // Idempotency guard: if this studyInstanceUid is already linked, return existing
  const existingLinkage = await getLinkageByStudyUid(studyInstanceUid);
  if (existingLinkage) {
    log.info("Duplicate ingest -- study already linked (idempotent)", {
      studyUid: studyInstanceUid,
      existingLinkageId: existingLinkage.id,
    });
    return { matched: true, linkage: existingLinkage, matchType: "already-linked" };
  }

  // Strategy 1: Exact AccessionNumber match
  if (accessionNumber) {
    const order = await findByAccession(accessionNumber);
    if (order && order.patientDfn === patientId) {
      const linkage = await createLinkage(order, payload, "automatic-accession");
      return { matched: true, linkage, matchType: "accession-exact" };
    }
    // AccessionNumber exists but patient mismatch — safety: quarantine
    if (order && order.patientDfn !== patientId) {
      const unmatched = await quarantineStudy(payload,
        `AccessionNumber ${accessionNumber} found but patient mismatch: order DFN=${order.patientDfn}, DICOM PatientID=${patientId}`);
      return { matched: false, unmatched };
    }
  }

  // Strategy 2: PatientID + Modality + date fuzzy match (same-day, same modality)
  if (patientId && modality) {
    const patientOrders = await findByPatientDfn(patientId);
    const today = (payload.studyDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
    const candidates = patientOrders.filter((o) =>
      o.modality === modality.toUpperCase() &&
      o.status !== "cancelled" &&
      o.status !== "discontinued" &&
      o.status !== "completed" &&
      !o.linkedStudyUid &&
      o.scheduledTime.replace(/-/g, "").startsWith(today.slice(0, 8))
    );
    if (candidates.length === 1) {
      const linkage = await createLinkage(candidates[0], payload, "automatic-patient-modality");
      return { matched: true, linkage, matchType: "patient-modality-date" };
    }
    if (candidates.length > 1) {
      const unmatched = await quarantineStudy(payload,
        `Multiple unlinked ${modality} orders for patient ${patientId} on ${today} -- ambiguous`);
      return { matched: false, unmatched };
    }
  }

  // No match — quarantine
  const unmatched = await quarantineStudy(payload,
    `No matching order found for PatientID=${patientId}, AccessionNumber=${accessionNumber || "none"}`);
  return { matched: false, unmatched };
}

async function createLinkage(
  order: WorklistItem,
  payload: OrthancStableStudyPayload,
  type: StudyLinkage["reconciliationType"],
): Promise<StudyLinkage> {
  const linkage: StudyLinkage = {
    id: randomUUID(),
    orderId: order.id,
    patientDfn: order.patientDfn,
    studyInstanceUid: payload.studyInstanceUid,
    orthancStudyId: payload.orthancStudyId,
    accessionNumber: order.accessionNumber,
    modality: payload.modality || order.modality,
    studyDate: payload.studyDate || "",
    studyDescription: payload.studyDescription || order.scheduledProcedure,
    seriesCount: payload.seriesCount || 0,
    instanceCount: payload.instanceCount || 0,
    reconciliationType: type,
    source: "prototype-sidecar",
    linkedAt: new Date().toISOString(),
  };

  linkageCache.set(linkage.id, linkage);
  if (_repo) {
    Promise.resolve(_repo.insertStudyLink({
      id: linkage.id,
      orderId: linkage.orderId,
      patientDfn: linkage.patientDfn,
      studyInstanceUid: linkage.studyInstanceUid,
      orthancStudyId: linkage.orthancStudyId,
      accessionNumber: linkage.accessionNumber,
      modality: linkage.modality,
      studyDate: linkage.studyDate,
      studyDescription: linkage.studyDescription,
      seriesCount: linkage.seriesCount,
      instanceCount: linkage.instanceCount,
      reconciliationType: linkage.reconciliationType,
      source: linkage.source,
    })).catch((e) => dbWarn("persist", e));
  }

  // Update the worklist item
  await updateWorklistItem(order.id, {
    status: "completed",
    linkedStudyUid: payload.studyInstanceUid,
    linkedOrthancStudyId: payload.orthancStudyId,
  });

  return linkage;
}

async function quarantineStudy(payload: OrthancStableStudyPayload, reason: string): Promise<UnmatchedStudy> {
  // Idempotency guard: don't re-quarantine same study
  for (const u of unmatchedCache.values()) {
    if (u.studyInstanceUid === payload.studyInstanceUid && !u.resolved) {
      log.info("Duplicate ingest -- study already quarantined (idempotent)", {
        studyUid: payload.studyInstanceUid,
        existingUnmatchedId: u.id,
      });
      return u;
    }
  }
  // Also check DB
  if (_repo) {
    try {
      const row = await Promise.resolve(_repo.findUnmatchedByStudyUid(payload.studyInstanceUid));
      if (row && !row.resolved) {
        const u = rowToUnmatched(row);
        unmatchedCache.set(u.id, u);
        return u;
      }
    } catch (e) { dbWarn("persist", e); }
  }

  const unmatched: UnmatchedStudy = {
    id: randomUUID(),
    orthancStudyId: payload.orthancStudyId,
    studyInstanceUid: payload.studyInstanceUid,
    dicomPatientId: payload.patientId,
    dicomPatientName: payload.patientName || "",
    accessionNumber: payload.accessionNumber || "",
    modality: payload.modality || "",
    studyDate: payload.studyDate || "",
    studyDescription: payload.studyDescription || "",
    seriesCount: payload.seriesCount || 0,
    instanceCount: payload.instanceCount || 0,
    reason,
    quarantinedAt: new Date().toISOString(),
    resolved: false,
  };

  unmatchedCache.set(unmatched.id, unmatched);
  if (_repo) {
    Promise.resolve(_repo.insertUnmatched({
      id: unmatched.id,
      orthancStudyId: unmatched.orthancStudyId,
      studyInstanceUid: unmatched.studyInstanceUid,
      dicomPatientId: unmatched.dicomPatientId,
      dicomPatientName: unmatched.dicomPatientName,
      accessionNumber: unmatched.accessionNumber,
      modality: unmatched.modality,
      studyDate: unmatched.studyDate,
      studyDescription: unmatched.studyDescription,
      seriesCount: unmatched.seriesCount,
      instanceCount: unmatched.instanceCount,
      reason: unmatched.reason,
    })).catch((e) => dbWarn("persist", e));
  }
  return unmatched;
}

/* ================================================================== */
/* Public accessors (for imaging-service chart integration)             */
/* ================================================================== */

export async function getLinkagesForPatient(dfn: string): Promise<StudyLinkage[]> {
  if (_repo) {
    try {
      const rows = await Promise.resolve(_repo.findStudyLinksForPatient(dfn));
      if (Array.isArray(rows)) {
        const items = rows.map(rowToLinkage);
        for (const it of items) linkageCache.set(it.id, it);
        return items;
      }
    } catch (e) { dbWarn("persist", e); }
  }
  return [...linkageCache.values()].filter((l) => l.patientDfn === dfn);
}

export async function getLinkageByStudyUid(studyUid: string): Promise<StudyLinkage | undefined> {
  for (const l of linkageCache.values()) {
    if (l.studyInstanceUid === studyUid) return l;
  }
  if (_repo) {
    try {
      const row = await Promise.resolve(_repo.findStudyLinkByStudyUid(studyUid));
      if (row) { const l = rowToLinkage(row); linkageCache.set(l.id, l); return l; }
    } catch (e) { dbWarn("persist", e); }
  }
  return undefined;
}

export async function getLinkageByOrderId(orderId: string): Promise<StudyLinkage | undefined> {
  for (const l of linkageCache.values()) {
    if (l.orderId === orderId) return l;
  }
  if (_repo) {
    try {
      const row = await Promise.resolve(_repo.findStudyLinkByOrderId(orderId));
      if (row) { const l = rowToLinkage(row); linkageCache.set(l.id, l); return l; }
    } catch (e) { dbWarn("persist", e); }
  }
  return undefined;
}

export async function getAllUnmatched(): Promise<UnmatchedStudy[]> {
  if (_repo) {
    try {
      const rows = await Promise.resolve(_repo.findAllUnresolved());
      if (Array.isArray(rows)) {
        const items = rows.map(rowToUnmatched);
        for (const it of items) unmatchedCache.set(it.id, it);
        return items;
      }
    } catch (e) { dbWarn("persist", e); }
  }
  return [...unmatchedCache.values()].filter((u) => !u.resolved);
}

/* ================================================================== */
/* Route definitions                                                   */
/* ================================================================== */

export default async function imagingIngestRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /imaging/ingest/callback — Orthanc OnStableStudy webhook.
   * Auth: X-Service-Key header (not session cookie).
   */
  server.post("/imaging/ingest/callback", async (request: FastifyRequest, reply: FastifyReply) => {
    // Service auth — NOT session auth
    if (!validateServiceKey(request)) {
      audit("security.rbac-denied", "denied", { duz: "service" }, {
        sourceIp: request.ip,
        detail: { endpoint: "/imaging/ingest/callback", reason: "invalid-service-key" },
      });
      reply.code(403).send({ ok: false, error: "Invalid service key" });
      return;
    }

    const payload = request.body as OrthancStableStudyPayload;
    if (!payload?.orthancStudyId || !payload?.studyInstanceUid || !payload?.patientId) {
      reply.code(400).send({
        ok: false,
        error: "Missing required fields: orthancStudyId, studyInstanceUid, patientId",
      });
      return;
    }

    log.info("Ingest callback received", {
      orthancStudyId: payload.orthancStudyId,
      patientId: payload.patientId,
      accessionNumber: payload.accessionNumber || "none",
      modality: payload.modality || "unknown",
    });

    const result = await reconcileStudy(payload);

    if (result.matched && result.linkage) {
      log.info("Study reconciled to order", {
        linkageId: result.linkage.id,
        orderId: result.linkage.orderId,
        matchType: result.matchType,
        studyUid: result.linkage.studyInstanceUid,
      });

      audit("imaging.study-linked", "success", { duz: "service" }, {
        patientDfn: result.linkage.patientDfn,
        detail: {
          linkageId: result.linkage.id,
          orderId: result.linkage.orderId,
          matchType: result.matchType,
          accession: result.linkage.accessionNumber,
        },
      });

      return {
        ok: true,
        reconciled: true,
        matchType: result.matchType,
        linkage: result.linkage,
      };
    }

    // Quarantined
    log.warn("Study quarantined — no matching order", {
      unmatchedId: result.unmatched?.id,
      reason: result.unmatched?.reason,
      patientId: payload.patientId,
    });

    audit("imaging.study-quarantined", "failure", { duz: "service" }, {
      detail: {
        unmatchedId: result.unmatched?.id,
        reason: result.unmatched?.reason,
        patientId: payload.patientId,
        accessionNumber: payload.accessionNumber || "none",
      },
    });

    reply.code(202).send({
      ok: true,
      reconciled: false,
      quarantined: true,
      reason: result.unmatched?.reason,
      unmatchedId: result.unmatched?.id,
    });
  });

  /**
   * GET /imaging/ingest/unmatched — List quarantined studies (admin).
   */
  server.get("/imaging/ingest/unmatched", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }
    if (session.role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    const items = await getAllUnmatched();
    return {
      ok: true,
      count: items.length,
      items,
    };
  });

  /**
   * POST /imaging/ingest/unmatched/:id/link — Manual reconciliation.
   * Body: { orderId: string }
   */
  server.post("/imaging/ingest/unmatched/:id/link", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }
    if (session.role !== "admin") {
      reply.code(403).send({ ok: false, error: "Admin role required" });
      return;
    }

    const { id } = request.params as { id: string };
    const body = request.body as { orderId?: string };

    let unmatched = unmatchedCache.get(id);
    if (!unmatched && _repo) {
      try {
        const row = await Promise.resolve(_repo.findUnmatchedById(id));
        if (row) { const u = rowToUnmatched(row); unmatchedCache.set(u.id, u); unmatched = u; }
      } catch (e) { dbWarn("persist", e); }
    }
    if (!unmatched || unmatched.resolved) {
      reply.code(404).send({ ok: false, error: "Unmatched study not found or already resolved" });
      return;
    }

    if (!body?.orderId) {
      reply.code(400).send({ ok: false, error: "Missing required field: orderId" });
      return;
    }

    const order = await getWorklistItem(body.orderId);
    if (!order) {
      reply.code(404).send({ ok: false, error: "Order not found" });
      return;
    }

    // Create manual linkage
    const payload: OrthancStableStudyPayload = {
      orthancStudyId: unmatched.orthancStudyId,
      studyInstanceUid: unmatched.studyInstanceUid,
      patientId: unmatched.dicomPatientId,
      patientName: unmatched.dicomPatientName,
      accessionNumber: unmatched.accessionNumber,
      modality: unmatched.modality,
      studyDate: unmatched.studyDate,
      studyDescription: unmatched.studyDescription,
      seriesCount: unmatched.seriesCount,
      instanceCount: unmatched.instanceCount,
    };

    const linkage = await createLinkage(order, payload, "manual");

    // Mark unmatched as resolved
    unmatched.resolved = true;
    unmatchedCache.set(id, unmatched);
    if (_repo) {
      Promise.resolve(_repo.resolveUnmatched(id)).catch((e) => dbWarn("persist", e));
    }

    log.info("Manual reconciliation", {
      unmatchedId: id,
      linkageId: linkage.id,
      orderId: order.id,
    });

    audit("imaging.study-linked", "success", {
      duz: session.duz, name: session.userName, role: session.role,
    }, {
      patientDfn: order.patientDfn,
      detail: {
        linkageId: linkage.id,
        orderId: order.id,
        matchType: "manual",
        previouslyQuarantined: id,
      },
    });

    return { ok: true, linkage };
  });

  /**
   * GET /imaging/ingest/linkages — All study-order linkages (admin).
   */
  server.get("/imaging/ingest/linkages", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const q = request.query as Record<string, string>;
    let linkages: StudyLinkage[];
    if (_repo) {
      try {
        const rows = await Promise.resolve(_repo.findAllStudyLinks());
        const arr = Array.isArray(rows) ? rows : [];
        linkages = arr.map(rowToLinkage);
      } catch (e) { dbWarn("findAllStudyLinks", e); linkages = [...linkageCache.values()]; }
    } else {
      linkages = [...linkageCache.values()];
    }

    if (q.patientDfn) linkages = linkages.filter((l) => l.patientDfn === q.patientDfn);
    if (q.orderId) linkages = linkages.filter((l) => l.orderId === q.orderId);

    return {
      ok: true,
      count: linkages.length,
      linkages,
    };
  });

  /**
   * GET /imaging/ingest/linkages/by-patient/:dfn — Linkages for a patient.
   */
  server.get("/imaging/ingest/linkages/by-patient/:dfn", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).session;
    if (!session) { reply.code(401).send({ ok: false, error: "Authentication required" }); return; }

    const { dfn } = request.params as { dfn: string };
    const linkages = await getLinkagesForPatient(dfn);

    return {
      ok: true,
      patientDfn: dfn,
      count: linkages.length,
      linkages,
    };
  });
}
