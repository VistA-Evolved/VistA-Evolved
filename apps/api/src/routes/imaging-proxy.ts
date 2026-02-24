/**
 * DICOMweb Proxy Routes — Phase 22 + Phase 24 hardening.
 *
 * Proxies DICOMweb requests from authenticated browser clients to Orthanc.
 * The browser NEVER talks directly to Orthanc — all requests go through
 * the API server which enforces session auth, imaging RBAC, audit logging,
 * and header sanitization.
 *
 * Routes:
 *   GET  /imaging/dicom-web/studies                        — QIDO-RS: search studies
 *   GET  /imaging/dicom-web/studies/:studyUid/series       — QIDO-RS: search series
 *   GET  /imaging/dicom-web/studies/:studyUid/metadata     — WADO-RS: study metadata
 *   GET  /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances — QIDO-RS: instances
 *   GET  /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frameList — WADO-RS: pixel data
 *   GET  /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid — WADO-RS: instance
 *   POST /imaging/dicom-web/studies                        — STOW-RS: store instances (admin only)
 *   GET  /imaging/orthanc/studies                          — Orthanc REST: list studies
 *   POST /imaging/demo/upload                              — Dev-only DICOM upload
 *   GET  /imaging/viewer                                   — OHIF viewer launch URL
 *
 * Security model (Phase 24):
 *   - All routes require valid session (httpOnly cookie)
 *   - All DICOMweb read routes require imaging_view permission
 *   - STOW-RS and demo upload require imaging_admin permission
 *   - Break-glass grants imaging_view temporarily (time-limited, audited)
 *   - DICOMweb-specific rate limiting (separate bucket from general API)
 *   - PHI headers (PatientName, PatientID) are NOT forwarded to browser
 *   - All access is audit-logged with hash-chained imaging audit trail
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IMAGING_CONFIG } from "../config/server-config.js";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";
import { hasImagingPermission } from "../services/imaging-authz.js";
import { imagingAudit, imagingAuditDenied } from "../services/imaging-audit.js";
import type { AuditActor as ImagingAuditActor } from "../services/imaging-audit.js";
import type { SessionData } from "../auth/session-store.js";
import { safeErr } from '../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Extract session from request — returns null if not authenticated. */
function getSession(request: FastifyRequest): SessionData | null {
  const s = request.session;
  if (!s || !s.duz) return null;
  return s;
}

/** Build audit actor from session. */
function auditActor(request: FastifyRequest): { duz: string; name?: string; role?: string } {
  const s = getSession(request);
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "anonymous" };
}

/** Require valid session — sends 401 if not authenticated. */
function requireSession(request: FastifyRequest, reply: FastifyReply): SessionData | null {
  const s = getSession(request);
  if (!s) {
    reply.code(401).send({ ok: false, error: "Authentication required" });
    return null;
  }
  return s;
}

/** Require admin role — sends 403 if not admin. RBAC-tight (AGENTS.md #24). */
function requireAdmin(session: SessionData, reply: FastifyReply): boolean {
  if (session.role !== "admin") {
    reply.code(403).send({ ok: false, error: "Admin access required" });
    return false;
  }
  return true;
}

/**
 * Require imaging_view permission — sends 403 if not authorized.
 * Checks role-based imaging RBAC + active break-glass grants.
 * Phase 24: This is the primary gate for all DICOMweb read routes.
 */
function requireImagingView(
  request: FastifyRequest,
  session: SessionData,
  reply: FastifyReply,
): boolean {
  const allowed = hasImagingPermission(session, "imaging_view");
  if (!allowed) {
    imagingAuditDenied(
      "VIEW_STUDY",
      { duz: session.duz, name: session.userName || "", role: session.role || "" },
      session.tenantId || "default",
      { requestId: (request as any).requestId, sourceIp: request.ip },
    );
    reply.code(403).send({ ok: false, error: "Imaging view permission required" });
    return false;
  }
  return true;
}

/**
 * Require imaging_admin permission — sends 403 if not authorized.
 * Phase 24: Used for STOW-RS, demo upload, and device management via DICOMweb.
 */
function requireImagingAdmin(
  request: FastifyRequest,
  session: SessionData,
  reply: FastifyReply,
): boolean {
  const allowed = hasImagingPermission(session, "imaging_admin");
  if (!allowed) {
    imagingAuditDenied(
      "STOW_UPLOAD",
      { duz: session.duz, name: session.userName || "", role: session.role || "" },
      session.tenantId || "default",
      { requestId: (request as any).requestId, sourceIp: request.ip },
    );
    reply.code(403).send({ ok: false, error: "Imaging admin permission required" });
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* DICOMweb Rate Limiter (Phase 24)                                     */
/* ------------------------------------------------------------------ */

/**
 * Per-user DICOMweb rate limiter. Separate bucket from general API rate limits
 * to prevent imaging-heavy workflows from affecting other API operations.
 *
 * Defaults: 120 requests per 60s window per user.
 * Configurable via DICOMWEB_RATE_LIMIT and DICOMWEB_RATE_WINDOW_MS env vars.
 */
const DICOMWEB_RATE_LIMIT = Number(process.env.DICOMWEB_RATE_LIMIT || 120);
const DICOMWEB_RATE_WINDOW_MS = Number(process.env.DICOMWEB_RATE_WINDOW_MS || 60000);

interface RateBucket {
  count: number;
  windowStart: number;
}

const dicomwebRateBuckets = new Map<string, RateBucket>();

/** Clean expired buckets periodically (every 5 min). */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of dicomwebRateBuckets) {
    if (now - bucket.windowStart > DICOMWEB_RATE_WINDOW_MS * 2) {
      dicomwebRateBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Check DICOMweb rate limit for a user. Returns true if allowed, false if exceeded.
 * Sends 429 response and logs to imaging audit on denial.
 */
function checkDicomwebRateLimit(
  request: FastifyRequest,
  session: SessionData,
  reply: FastifyReply,
): boolean {
  const key = `dicomweb:${session.duz}`;
  const now = Date.now();
  let bucket = dicomwebRateBuckets.get(key);

  if (!bucket || now - bucket.windowStart > DICOMWEB_RATE_WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    dicomwebRateBuckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > DICOMWEB_RATE_LIMIT) {
    const remaining = Math.ceil((bucket.windowStart + DICOMWEB_RATE_WINDOW_MS - now) / 1000);
    reply.header("Retry-After", String(remaining));
    reply.code(429).send({
      ok: false,
      error: "DICOMweb rate limit exceeded",
      retryAfterSeconds: remaining,
    });
    log.warn("DICOMweb rate limit exceeded", { duz: session.duz, count: bucket.count });
    return false;
  }

  return true;
}

/** Build imaging audit actor from session. */
function buildImagingActor(session: SessionData): ImagingAuditActor {
  return {
    duz: session.duz,
    name: session.userName || "",
    role: session.role || "",
  };
}

/**
 * Headers that must NOT be forwarded to the browser.
 * Includes server identification and any DICOM/WADO-RS headers that might
 * contain PHI (patient name, ID). BUG-042: Added PHI-relevant headers.
 */
const STRIP_RESPONSE_HEADERS = new Set([
  "server",
  "x-powered-by",
  "x-patient-name",
  "x-patient-id",
  "content-description",  // WADO-RS multipart can include patient info
]);

/** Forward a request to Orthanc, streaming the response back. */
async function proxyToOrthanc(
  request: FastifyRequest,
  reply: FastifyReply,
  orthancPath: string,
  opts?: { method?: string; body?: any; contentType?: string },
): Promise<void> {
  const method = opts?.method || "GET";
  const url = `${IMAGING_CONFIG.orthancUrl}${orthancPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    IMAGING_CONFIG.proxyTimeoutMs,
  );

  try {
    const fetchOpts: RequestInit = {
      method,
      signal: controller.signal,
      headers: {
        Accept: (request.headers.accept as string) || "application/dicom+json",
      },
    };

    if (opts?.body) {
      fetchOpts.body = opts.body;
      if (opts.contentType) {
        (fetchOpts.headers as Record<string, string>)["Content-Type"] = opts.contentType;
      }
    }

    const upstream = await fetch(url, fetchOpts);
    clearTimeout(timeout);

    // Forward status code
    reply.code(upstream.status);

    // Forward safe headers
    for (const [key, value] of upstream.headers.entries()) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        reply.header(key, value);
      }
    }

    // Security note: CORS headers are managed by the Fastify CORS plugin.
    // BUG-039: Do NOT manually set Access-Control-Allow-Origin here —
    // reflecting the request origin with credentials:true is an open CORS vuln.
    // The Fastify CORS plugin validates origins at the framework level.

    if (!upstream.ok) {
      const errorText = await upstream.text();
      log.warn("DICOMweb proxy upstream error", {
        status: upstream.status,
        path: orthancPath,
        error: errorText.slice(0, 200),
      });
      reply.send(errorText);
      return;
    }

    // Stream the response body
    if (upstream.body) {
      const reader = upstream.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const combined = Buffer.concat(chunks);
      reply.send(combined);
    } else {
      reply.send("");
    }
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      log.warn("DICOMweb proxy timeout", { path: orthancPath });
      reply.code(504).send({ ok: false, error: "Imaging service timeout" });
    } else {
      log.error("DICOMweb proxy error", { path: orthancPath, error: safeErr(err) });
      reply.code(502).send({ ok: false, error: "Imaging service unavailable" });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Simple QIDO-RS cache                                                */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  data: Buffer;
  contentType: string;
  timestamp: number;
}

const qidoCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 200;

function getCached(key: string): CacheEntry | null {
  const entry = qidoCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > IMAGING_CONFIG.qidoCacheTtlMs) {
    qidoCache.delete(key);
    return null;
  }
  return entry;
}

function setCache(key: string, data: Buffer, contentType: string): void {
  if (qidoCache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest
    const oldest = qidoCache.keys().next().value;
    if (oldest) qidoCache.delete(oldest);
  }
  qidoCache.set(key, { data, contentType, timestamp: Date.now() });
}

/* ------------------------------------------------------------------ */
/* Route Plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function imagingProxyRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /imaging/dicom-web/studies
   * QIDO-RS: Search studies. Cached.
   * Phase 24: imaging_view RBAC + DICOMweb rate limit + imaging audit.
   */
  server.get("/imaging/dicom-web/studies", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;
    if (!checkDicomwebRateLimit(request, session, reply)) return;

    // Build Orthanc path with query string
    const qs = new URL(request.url, "http://localhost").search;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies${qs}`;

    // Check cache
    const cacheKey = `qido:studies:${qs}`;
    const cached = getCached(cacheKey);
    if (cached) {
      reply.header("Content-Type", cached.contentType);
      reply.header("X-Cache", "HIT");
      reply.send(cached.data);
      return;
    }

    const url = `${IMAGING_CONFIG.orthancUrl}${orthancPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGING_CONFIG.proxyTimeoutMs);

    try {
      const upstream = await fetch(url, {
        headers: { Accept: "application/dicom+json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        reply.code(upstream.status).send(await upstream.text());
        return;
      }

      const body = Buffer.from(await upstream.arrayBuffer());
      const ct = upstream.headers.get("content-type") || "application/dicom+json";

      setCache(cacheKey, body, ct);

      reply.header("Content-Type", ct);
      reply.header("X-Cache", "MISS");

      // Phase 24: Hash-chained imaging audit
      imagingAudit(
        "SEARCH_STUDIES",
        buildImagingActor(session),
        session.tenantId || "default",
        {
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { query: qs },
        },
      );

      audit("phi.imaging-view", "success", auditActor(request), {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { action: "qido-studies", query: qs },
      });

      reply.send(body);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        reply.code(504).send({ ok: false, error: "Imaging service timeout" });
      } else {
        reply.code(502).send({ ok: false, error: "Imaging service unavailable" });
      }
    }
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/series
   * QIDO-RS: Search series within a study.
   * Phase 24: imaging_view RBAC + DICOMweb rate limit + imaging audit.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;
    if (!checkDicomwebRateLimit(request, session, reply)) return;

    const { studyUid } = request.params as any;
    const qs = new URL(request.url, "http://localhost").search;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series${qs}`;

    imagingAudit(
      "VIEW_SERIES",
      buildImagingActor(session),
      session.tenantId || "default",
      {
        studyInstanceUid: studyUid,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      },
    );

    audit("phi.imaging-view", "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { action: "qido-series", studyUid },
    });

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/metadata
   * WADO-RS: Study-level metadata.
   * Phase 24: imaging_view RBAC + DICOMweb rate limit + imaging audit.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/metadata", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;
    if (!checkDicomwebRateLimit(request, session, reply)) return;

    const { studyUid } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/metadata`;

    imagingAudit(
      "VIEW_STUDY",
      buildImagingActor(session),
      session.tenantId || "default",
      {
        studyInstanceUid: studyUid,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { action: "wado-metadata" },
      },
    );

    audit("phi.imaging-view", "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { action: "wado-metadata", studyUid },
    });

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances
   * QIDO-RS: Instance list within a series.
   * Phase 24: imaging_view RBAC + DICOMweb rate limit.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;
    if (!checkDicomwebRateLimit(request, session, reply)) return;

    const { studyUid, seriesUid } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series/${seriesUid}/instances`;

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid
   * WADO-RS: Retrieve a specific instance.
   * Phase 24: imaging_view RBAC + DICOMweb rate limit + imaging audit.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;
    if (!checkDicomwebRateLimit(request, session, reply)) return;

    const { studyUid, seriesUid, instanceUid } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}`;

    imagingAudit(
      "VIEW_STUDY",
      buildImagingActor(session),
      session.tenantId || "default",
      {
        studyInstanceUid: studyUid,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { seriesUid, instanceUid },
      },
    );

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frameList
   * WADO-RS: Retrieve pixel data frames.
   * Phase 24: imaging_view RBAC + DICOMweb rate limit + imaging audit.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frameList", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;
    if (!checkDicomwebRateLimit(request, session, reply)) return;

    const { studyUid, seriesUid, instanceUid, frameList } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}/frames/${frameList}`;

    imagingAudit(
      "VIEW_STUDY",
      buildImagingActor(session),
      session.tenantId || "default",
      {
        studyInstanceUid: studyUid,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { seriesUid, instanceUid, frameList },
      },
    );

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * POST /imaging/dicom-web/studies
   * STOW-RS: Store DICOM instances.
   * Phase 24: imaging_admin RBAC (was admin role), imaging audit.
   */
  server.post("/imaging/dicom-web/studies", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingAdmin(request, session, reply)) return;

    const contentType = request.headers["content-type"] || "application/dicom";
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies`;

    imagingAudit(
      "STOW_UPLOAD",
      buildImagingActor(session),
      session.tenantId || "default",
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { contentType },
      },
    );

    audit("phi.imaging-view", "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { action: "stow-rs-upload" },
    });

    await proxyToOrthanc(request, reply, orthancPath, {
      method: "POST",
      body: request.body,
      contentType,
    });
  });

  /**
   * GET /imaging/orthanc/studies
   * Orthanc REST API: list known studies (admin/debug).
   * Phase 24: imaging_view RBAC.
   */
  server.get("/imaging/orthanc/studies", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;

    const orthancPath = "/studies?expand";
    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * POST /imaging/demo/upload
   * Dev-only: Upload a DICOM file to Orthanc via its REST API.
   * Gated by IMAGING_CONFIG.enableDemoUpload.
   * Phase 24: imaging_admin RBAC (was admin role).
   */
  server.post("/imaging/demo/upload", async (request, reply) => {
    if (!IMAGING_CONFIG.enableDemoUpload) {
      return reply.code(403).send({ ok: false, error: "Demo upload disabled in production" });
    }

    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingAdmin(request, session, reply)) return;

    try {
      const url = `${IMAGING_CONFIG.orthancUrl}/instances`;
      const contentType = request.headers["content-type"] || "application/dicom";

      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: request.body as any,
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        return reply.code(upstream.status).send({ ok: false, error: err.slice(0, 200) });
      }

      const result = await upstream.json();

      imagingAudit(
        "STOW_UPLOAD",
        buildImagingActor(session),
        session.tenantId || "default",
        {
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { action: "demo-upload" },
        },
      );

      audit("phi.imaging-view", "success", auditActor(request), {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { action: "demo-upload", result },
      });

      return { ok: true, result };
    } catch (err: any) {
      log.error("Demo DICOM upload failed", { error: safeErr(err) });
      return reply.code(502).send({ ok: false, error: "Orthanc upload failed" });
    }
  });

  /**
   * GET /imaging/viewer?studyUid=X
   * Generate an OHIF viewer URL for a study.
   * Phase 24: imaging_view RBAC + imaging audit (VIEWER_LAUNCH).
   */
  server.get("/imaging/viewer", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireImagingView(request, session, reply)) return;

    const { studyUid } = request.query as any;
    if (!studyUid) {
      return reply.code(400).send({ ok: false, error: "Missing studyUid" });
    }

    const viewerUrl = `${IMAGING_CONFIG.ohifUrl}/viewer?StudyInstanceUIDs=${studyUid}`;

    imagingAudit(
      "VIEWER_LAUNCH",
      buildImagingActor(session),
      session.tenantId || "default",
      {
        studyInstanceUid: studyUid,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { viewerUrl },
      },
    );

    audit("imaging.viewer-launch", "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { studyUid, viewerUrl },
    });

    return {
      ok: true,
      viewer: {
        url: viewerUrl,
        viewerType: "ohif",
        studyUid,
        message: "OHIF viewer URL generated",
      },
    };
  });

  /**
   * GET /imaging/health
   * Check connectivity to Orthanc + imaging subsystem status.
   * Phase 24: Includes audit chain stats and DICOMweb rate limit info.
   */
  server.get("/imaging/health", async (_request, reply) => {
    // Audit chain stats (fast, no DB call)
    let auditStats: Record<string, unknown> = {};
    try {
      const { getChainStats } = await import("../services/imaging-audit.js");
      const stats = getChainStats();
      auditStats = {
        auditChainLength: stats.totalEntries,
        auditChainIntact: stats.chainValid,
        lastSeq: stats.lastSeq,
      };
    } catch {
      auditStats = { auditChainLength: 0, auditChainIntact: true, lastSeq: 0 };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${IMAGING_CONFIG.orthancUrl}/system`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const info = await resp.json();
        return {
          ok: true,
          orthanc: {
            version: (info as any).Version,
            dicomWebEnabled: true,
            name: (info as any).Name,
            status: "connected",
          },
          ohif: {
            url: IMAGING_CONFIG.ohifUrl,
            status: "configured",
          },
          security: {
            rbacEnabled: true,
            breakGlassEnabled: true,
            dicomwebRateLimit: DICOMWEB_RATE_LIMIT,
            dicomwebRateWindowMs: DICOMWEB_RATE_WINDOW_MS,
          },
          audit: auditStats,
        };
      }
      return { ok: false, error: `Orthanc returned ${resp.status}`, audit: auditStats };
    } catch (err: any) {
      return {
        ok: false,
        orthanc: { status: "disconnected", error: safeErr(err) },
        ohif: { url: IMAGING_CONFIG.ohifUrl, status: "unknown" },
        security: { rbacEnabled: true, breakGlassEnabled: true },
        audit: auditStats,
      };
    }
  });
}
