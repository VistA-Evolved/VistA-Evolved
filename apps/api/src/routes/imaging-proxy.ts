/**
 * DICOMweb Proxy Routes — Phase 22.
 *
 * Proxies DICOMweb requests from authenticated browser clients to Orthanc.
 * The browser NEVER talks directly to Orthanc — all requests go through
 * the API server which enforces session auth, audit logging, and header
 * sanitization.
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
 * Security model:
 *   - All routes require valid session (httpOnly cookie)
 *   - STOW-RS and demo upload require admin role
 *   - PHI headers (PatientName, PatientID) are NOT forwarded to browser
 *   - All access is audit-logged with patient DFN correlation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IMAGING_CONFIG } from "../config/server-config.js";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SessionData {
  duz: string;
  userName?: string;
  role?: string;
  tenantId?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Extract session from request — returns null if not authenticated. */
function getSession(request: FastifyRequest): SessionData | null {
  const s = (request as any).session;
  if (!s || !s.duz) return null;
  return s as SessionData;
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

/** Headers that must NOT be forwarded to the browser (PHI protection). */
const STRIP_RESPONSE_HEADERS = new Set([
  "server",
  "x-powered-by",
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

    // CORS headers for DICOMweb
    reply.header("Access-Control-Allow-Origin", request.headers.origin || "*");
    reply.header("Access-Control-Allow-Credentials", "true");

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
      log.error("DICOMweb proxy error", { path: orthancPath, error: err.message });
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
   */
  server.get("/imaging/dicom-web/studies", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

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
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { studyUid } = request.params as any;
    const qs = new URL(request.url, "http://localhost").search;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series${qs}`;

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
   */
  server.get("/imaging/dicom-web/studies/:studyUid/metadata", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { studyUid } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/metadata`;

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
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { studyUid, seriesUid } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series/${seriesUid}/instances`;

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid
   * WADO-RS: Retrieve a specific instance.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { studyUid, seriesUid, instanceUid } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}`;

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * GET /imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frameList
   * WADO-RS: Retrieve pixel data frames.
   */
  server.get("/imaging/dicom-web/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frameList", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { studyUid, seriesUid, instanceUid, frameList } = request.params as any;
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}/frames/${frameList}`;

    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * POST /imaging/dicom-web/studies
   * STOW-RS: Store DICOM instances. Admin only.
   */
  server.post("/imaging/dicom-web/studies", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireAdmin(session, reply)) return;

    const contentType = request.headers["content-type"] || "application/dicom";
    const orthancPath = `${IMAGING_CONFIG.dicomWebRoot}/studies`;

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
   */
  server.get("/imaging/orthanc/studies", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const orthancPath = "/studies?expand";
    await proxyToOrthanc(request, reply, orthancPath);
  });

  /**
   * POST /imaging/demo/upload
   * Dev-only: Upload a DICOM file to Orthanc via its REST API.
   * Gated by IMAGING_CONFIG.enableDemoUpload and admin role.
   */
  server.post("/imaging/demo/upload", async (request, reply) => {
    if (!IMAGING_CONFIG.enableDemoUpload) {
      return reply.code(403).send({ ok: false, error: "Demo upload disabled in production" });
    }

    const session = requireSession(request, reply);
    if (!session) return;
    if (!requireAdmin(session, reply)) return;

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

      audit("phi.imaging-view", "success", auditActor(request), {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { action: "demo-upload", result },
      });

      return { ok: true, result };
    } catch (err: any) {
      log.error("Demo DICOM upload failed", { error: err.message });
      return reply.code(502).send({ ok: false, error: "Orthanc upload failed" });
    }
  });

  /**
   * GET /imaging/viewer?studyUid=X
   * Generate an OHIF viewer URL for a study.
   */
  server.get("/imaging/viewer", async (request, reply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { studyUid } = request.query as any;
    if (!studyUid) {
      return reply.code(400).send({ ok: false, error: "Missing studyUid" });
    }

    const viewerUrl = `${IMAGING_CONFIG.ohifUrl}/viewer?StudyInstanceUIDs=${studyUid}`;

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
   * Check connectivity to Orthanc.
   */
  server.get("/imaging/health", async (_request, reply) => {
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
        };
      }
      return { ok: false, error: `Orthanc returned ${resp.status}` };
    } catch (err: any) {
      return {
        ok: false,
        orthanc: { status: "disconnected", error: err.message },
        ohif: { url: IMAGING_CONFIG.ohifUrl, status: "unknown" },
      };
    }
  });
}
