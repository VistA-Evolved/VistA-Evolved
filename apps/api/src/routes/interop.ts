/**
 * Interop routes — Phase 18B/D.
 *
 * API endpoints for managing the integration registry, probing integrations,
 * and onboarding devices/modalities.
 *
 * VistA HL7/HLO file binding:
 *   The integration registry is a PLATFORM connector catalog. For hl7v2-type
 *   integrations, the ground-truth HL7 link status lives in VistA files:
 *     - #870  HL LOGICAL LINK       — link definitions, status, address/port
 *     - #772  HL7 MESSAGE TEXT       — raw HL7 message segments
 *     - #773  HL7 MESSAGE ADMIN      — message-level status/tracking
 *     - #776  HL MONITOR JOB         — background filer job health
 *     - #779.x HLO registries/queues — HLO app registry, subscriptions, queues
 *   Future: read VistA HL7 files via custom RPCs (see docs/interop-grounding.md).
 *
 * All endpoints are admin-only (enforced by AUTH_RULES in security.ts which
 * matches /admin/* to require admin role).
 *
 * See: docs/interop-grounding.md
 *
 * Routes:
 *   GET    /admin/registry/:tenantId                    — list integrations
 *   GET    /admin/registry/:tenantId/:integrationId     — get single integration
 *   PUT    /admin/registry/:tenantId/:integrationId     — create/update integration
 *   DELETE /admin/registry/:tenantId/:integrationId     — delete integration
 *   POST   /admin/registry/:tenantId/:integrationId/toggle — enable/disable
 *   POST   /admin/registry/:tenantId/:integrationId/probe  — probe single
 *   POST   /admin/registry/:tenantId/probe-all             — probe all enabled
 *   GET    /admin/registry/:tenantId/health-summary        — integration health summary
 *   GET    /admin/registry/:tenantId/error-log/:integrationId — error log for one
 *   POST   /admin/registry/:tenantId/onboard-device        — onboard a new device
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";
import { probeConnect } from "../vista/rpcBroker.js";
import {
  listIntegrations,
  getIntegration,
  upsertIntegration,
  deleteIntegration,
  toggleIntegration,
  updateIntegrationStatus,
  getIntegrationHealthSummary,
  recordIntegrationError,
  type IntegrationEntry,
  type IntegrationType,
  type IntegrationStatus,
  type DeviceConfig,
} from "../config/integration-registry.js";

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

/**
 * Probe a single integration for connectivity.
 * Returns the resulting status.
 */
async function probeIntegration(entry: IntegrationEntry): Promise<IntegrationStatus> {
  if (!entry.enabled) return "disabled";

  switch (entry.type) {
    case "vista-rpc": {
      try {
        await probeConnect();
        return "connected";
      } catch {
        return "disconnected";
      }
    }

    case "fhir":
    case "fhir-c0fhir":
    case "dicomweb": {
      // HTTP-based probe: try a simple GET to the base endpoint
      try {
        const protocol = entry.port === 443 ? "https" : "http";
        const url = `${protocol}://${entry.host}:${entry.port}${entry.basePath || "/"}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeout);
        return resp.ok ? "connected" : "degraded";
      } catch {
        return "disconnected";
      }
    }

    case "dicom":
    case "hl7v2":
    case "lis":
    case "pacs-vna":
    case "device": {
      // TCP-based check: try to open a socket
      try {
        const net = await import("net");
        return await new Promise<IntegrationStatus>((resolve) => {
          const sock = net.createConnection({ host: entry.host, port: entry.port, timeout: 5000 });
          sock.on("connect", () => { sock.destroy(); resolve("connected"); });
          sock.on("error", () => { sock.destroy(); resolve("disconnected"); });
          sock.on("timeout", () => { sock.destroy(); resolve("disconnected"); });
        });
      } catch {
        return "disconnected";
      }
    }

    default:
      return "unknown";
  }
}

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

export default async function interopRoutes(server: FastifyInstance): Promise<void> {

  // ── List integrations ───────────────────────────────────────────

  server.get("/admin/registry/:tenantId", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId } = request.params as { tenantId: string };
    const entries = listIntegrations(tenantId);
    return { ok: true, tenantId, integrations: entries, count: entries.length };
  });

  // ── Get single integration ─────────────────────────────────────

  server.get("/admin/registry/:tenantId/:integrationId", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId, integrationId } = request.params as { tenantId: string; integrationId: string };
    const entry = getIntegration(tenantId, integrationId);
    if (!entry) return reply.code(404).send({ ok: false, error: "Integration not found" });
    return { ok: true, tenantId, integration: entry };
  });

  // ── Create/update integration ──────────────────────────────────

  server.put("/admin/registry/:tenantId/:integrationId", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId, integrationId } = request.params as { tenantId: string; integrationId: string };
    const body = request.body as Partial<IntegrationEntry>;

    const existing = getIntegration(tenantId, integrationId);
    const now = new Date().toISOString();

    const entry: IntegrationEntry = {
      id: integrationId,
      label: body.label ?? existing?.label ?? integrationId,
      type: (body.type ?? existing?.type ?? "external") as IntegrationType,
      enabled: body.enabled ?? existing?.enabled ?? true,
      host: body.host ?? existing?.host ?? "127.0.0.1",
      port: body.port ?? existing?.port ?? 0,
      basePath: body.basePath ?? existing?.basePath ?? "",
      authMethod: body.authMethod ?? existing?.authMethod ?? "none",
      status: existing?.status ?? "unknown",
      lastChecked: existing?.lastChecked ?? null,
      lastSuccess: existing?.lastSuccess ?? null,
      lastError: existing?.lastError ?? null,
      errorLog: existing?.errorLog ?? [],
      queueMetrics: existing?.queueMetrics ?? { pending: 0, processed: 0, errors: 0, lastProcessed: null, avgLatencyMs: 0 },
      config: body.config ?? existing?.config ?? { kind: "external", settings: {} },
      notes: body.notes ?? existing?.notes ?? "",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const result = upsertIntegration(tenantId, entry);

    audit("integration.config-change" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, integrationId, type: entry.type, action: existing ? "update" : "create" },
    });
    log.info("Integration upserted", { tenantId, integrationId, type: entry.type });
    return { ok: true, tenantId, integration: result };
  });

  // ── Delete integration ─────────────────────────────────────────

  server.delete("/admin/registry/:tenantId/:integrationId", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId, integrationId } = request.params as { tenantId: string; integrationId: string };
    const deleted = deleteIntegration(tenantId, integrationId);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Integration not found" });

    audit("integration.config-change" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, integrationId, action: "delete" },
    });
    log.info("Integration deleted", { tenantId, integrationId });
    return { ok: true, deleted: integrationId };
  });

  // ── Toggle enable/disable ──────────────────────────────────────

  server.post("/admin/registry/:tenantId/:integrationId/toggle", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId, integrationId } = request.params as { tenantId: string; integrationId: string };
    const { enabled } = request.body as { enabled: boolean };

    const result = toggleIntegration(tenantId, integrationId, enabled);
    if (!result) return reply.code(404).send({ ok: false, error: "Integration not found" });

    audit("integration.config-change" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, integrationId, enabled },
    });
    log.info("Integration toggled", { tenantId, integrationId, enabled });
    return { ok: true, tenantId, integration: result };
  });

  // ── Probe single integration ───────────────────────────────────

  server.post("/admin/registry/:tenantId/:integrationId/probe", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId, integrationId } = request.params as { tenantId: string; integrationId: string };

    const entry = getIntegration(tenantId, integrationId);
    if (!entry) return reply.code(404).send({ ok: false, error: "Integration not found" });

    const startMs = Date.now();
    const status = await probeIntegration(entry);
    const latencyMs = Date.now() - startMs;

    const errorMsg = status === "disconnected" ? `Probe failed after ${latencyMs}ms` : undefined;
    updateIntegrationStatus(tenantId, integrationId, status, errorMsg);

    audit("integration.probe" as any, status === "connected" ? "success" : "failure", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, integrationId, status, latencyMs },
    });

    return { ok: true, tenantId, integrationId, status, latencyMs };
  });

  // ── Probe all enabled integrations ─────────────────────────────

  server.post("/admin/registry/:tenantId/probe-all", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId } = request.params as { tenantId: string };

    const entries = listIntegrations(tenantId).filter((e) => e.enabled);
    const results: Array<{ id: string; status: IntegrationStatus; latencyMs: number }> = [];

    for (const entry of entries) {
      const startMs = Date.now();
      const status = await probeIntegration(entry);
      const latencyMs = Date.now() - startMs;

      const errorMsg = status === "disconnected" ? `Probe failed after ${latencyMs}ms` : undefined;
      updateIntegrationStatus(tenantId, entry.id, status, errorMsg);
      results.push({ id: entry.id, status, latencyMs });
    }

    audit("integration.probe" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, probeResults: results },
    });

    return { ok: true, tenantId, results };
  });

  // ── Health summary ─────────────────────────────────────────────

  server.get("/admin/registry/:tenantId/health-summary", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId } = request.params as { tenantId: string };
    const summary = getIntegrationHealthSummary(tenantId);

    audit("integration.dashboard-view" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId },
    });

    return { ok: true, tenantId, summary };
  });

  // ── Error log for one integration ──────────────────────────────

  server.get("/admin/registry/:tenantId/error-log/:integrationId", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId, integrationId } = request.params as { tenantId: string; integrationId: string };
    const entry = getIntegration(tenantId, integrationId);
    if (!entry) return reply.code(404).send({ ok: false, error: "Integration not found" });
    return { ok: true, tenantId, integrationId, errorLog: entry.errorLog };
  });

  // ── Device onboarding ──────────────────────────────────────────

  /**
   * POST /admin/registry/:tenantId/onboard-device
   *
   * Onboard a new device/modality. Generates an integration entry with
   * type "device" and validates required fields.
   *
   * Body: { id, label, host, port, manufacturer, model, serialNumber,
   *         modalityCode, aeTitle, location, worklistAeTitle?, conformanceClasses? }
   */
  server.post("/admin/registry/:tenantId/onboard-device", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as Record<string, any>;

    // Validate required fields
    const required = ["id", "label", "host", "port", "manufacturer", "model", "modalityCode"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return reply.code(400).send({
        ok: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Check for duplicate ID
    if (getIntegration(tenantId, body.id)) {
      return reply.code(409).send({
        ok: false,
        error: `Integration with ID '${body.id}' already exists`,
      });
    }

    const now = new Date().toISOString();
    const deviceConfig: DeviceConfig = {
      kind: "device",
      manufacturer: body.manufacturer,
      model: body.model,
      serialNumber: body.serialNumber || "",
      modalityCode: body.modalityCode,
      aeTitle: body.aeTitle || "",
      location: body.location || "",
      worklistAeTitle: body.worklistAeTitle || "",
      conformanceClasses: body.conformanceClasses || [],
    };

    const entry: IntegrationEntry = {
      id: body.id,
      label: body.label,
      type: "device",
      enabled: true,
      host: body.host,
      port: body.port,
      basePath: "",
      authMethod: "none",
      status: "unknown",
      lastChecked: null,
      lastSuccess: null,
      lastError: null,
      errorLog: [],
      queueMetrics: { pending: 0, processed: 0, errors: 0, lastProcessed: null, avgLatencyMs: 0 },
      config: deviceConfig,
      notes: body.notes || `${body.manufacturer} ${body.model} — ${body.modalityCode}`,
      createdAt: now,
      updatedAt: now,
    };

    const result = upsertIntegration(tenantId, entry);

    audit("integration.device-onboard" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: {
        tenantId,
        deviceId: body.id,
        manufacturer: body.manufacturer,
        model: body.model,
        modalityCode: body.modalityCode,
      },
    });
    log.info("Device onboarded", {
      tenantId,
      deviceId: body.id,
      modality: body.modalityCode,
    });

    return { ok: true, tenantId, device: result };
  });
}
