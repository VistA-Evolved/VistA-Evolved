/**
 * HL7v2 Message Template Routes
 *
 * Phase 319 (W14-P3): REST endpoints for the message template library.
 *
 * Routes:
 *   GET    /hl7/templates           — list templates
 *   POST   /hl7/templates           — create template
 *   GET    /hl7/templates/:id       — get template
 *   POST   /hl7/templates/:id/status — update template status
 *   PUT    /hl7/templates/:id/segments — update segment templates
 *   PUT    /hl7/templates/:id/profiles — update conformance profiles
 *   POST   /hl7/templates/:id/clone — clone template
 *   DELETE /hl7/templates/:id       — delete draft template
 *   POST   /hl7/templates/:id/validate — validate message against template
 *   GET    /hl7/templates/:id/conformance — get conformance summary
 *   GET    /hl7/templates/profiles  — list well-known conformance profiles
 *   GET    /hl7/templates/stats     — template store stats
 */

import type { FastifyInstance } from "fastify";
import { parseMessage } from "../hl7/parser.js";
import {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplateStatus,
  updateTemplateSegments,
  updateTemplateProfiles,
  cloneTemplate,
  deleteTemplate,
  getTemplateStoreStats,
  validateAgainstTemplate,
  getConformanceSummary,
  WELL_KNOWN_PROFILES,
} from "../hl7/templates/index.js";
import type { TemplateStatus } from "../hl7/templates/types.js";

const DEFAULT_TENANT = "default";
const VALID_STATUSES: TemplateStatus[] = ["draft", "active", "deprecated", "archived"];

function getTenantId(request: any): string {
  return (request as any).session?.tenantId || DEFAULT_TENANT;
}

function getUserId(request: any): string {
  return (request as any).session?.duz || "system";
}

export async function hl7TemplateRoutes(app: FastifyInstance): Promise<void> {

  // ─── Static endpoints (must come before :id routes) ──────────────

  app.get("/hl7/templates/profiles", async () => {
    return { ok: true, count: WELL_KNOWN_PROFILES.length, profiles: WELL_KNOWN_PROFILES };
  });

  app.get("/hl7/templates/stats", async (request) => {
    const stats = getTemplateStoreStats();
    return { ok: true, ...stats };
  });

  // ─── CRUD ────────────────────────────────────────────────────────

  app.get("/hl7/templates", async (request) => {
    const query = request.query as Record<string, string>;
    const templateList = listTemplates(getTenantId(request), {
      messageType: query.messageType,
      status: query.status as TemplateStatus,
      scope: query.scope as any,
      packId: query.packId,
      tag: query.tag,
    });
    return {
      ok: true,
      count: templateList.length,
      templates: templateList.map((t) => ({
        id: t.id,
        name: t.name,
        messageType: t.messageType,
        hl7Version: t.hl7Version,
        templateVersion: t.templateVersion,
        status: t.status,
        scope: t.scope,
        profileCount: t.profiles.length,
        segmentCount: t.segments.length,
        tags: t.tags,
        createdAt: t.createdAt,
      })),
    };
  });

  app.post("/hl7/templates", async (request, reply) => {
    const body = (request.body as any) || {};
    const { name, description, messageType } = body;
    if (!name || !messageType) {
      reply.code(400);
      return { ok: false, error: "name and messageType are required" };
    }
    const template = createTemplate(
      getTenantId(request),
      {
        name,
        description: description || "",
        messageType,
        hl7Version: body.hl7Version,
        templateVersion: body.templateVersion,
        profiles: body.profiles,
        segments: body.segments,
        packId: body.packId,
        tags: body.tags,
      },
      getUserId(request),
    );
    reply.code(201);
    return { ok: true, template };
  });

  app.get("/hl7/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = getTemplate(getTenantId(request), id);
    if (!template) {
      reply.code(404);
      return { ok: false, error: "template_not_found" };
    }
    return { ok: true, template };
  });

  app.post("/hl7/templates/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { status } = body;
    if (!status || !VALID_STATUSES.includes(status)) {
      reply.code(400);
      return { ok: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` };
    }
    const result = updateTemplateStatus(getTenantId(request), id, status);
    if (!result.ok) {
      const code = result.error === "template_not_found" ? 404 : 409;
      reply.code(code);
      return { ok: false, error: result.error };
    }
    return { ok: true, template: result.template };
  });

  app.put("/hl7/templates/:id/segments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { segments } = body;
    if (!Array.isArray(segments)) {
      reply.code(400);
      return { ok: false, error: "segments array is required" };
    }
    const result = updateTemplateSegments(getTenantId(request), id, segments);
    if (!result.ok) {
      reply.code(result.error === "template_not_found" ? 404 : 409);
      return { ok: false, error: result.error };
    }
    return { ok: true, template: result.template };
  });

  app.put("/hl7/templates/:id/profiles", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { profiles } = body;
    if (!Array.isArray(profiles)) {
      reply.code(400);
      return { ok: false, error: "profiles array is required" };
    }
    const result = updateTemplateProfiles(getTenantId(request), id, profiles);
    if (!result.ok) {
      reply.code(result.error === "template_not_found" ? 404 : 409);
      return { ok: false, error: result.error };
    }
    return { ok: true, template: result.template };
  });

  app.post("/hl7/templates/:id/clone", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { name } = body;
    if (!name) {
      reply.code(400);
      return { ok: false, error: "name is required" };
    }
    const cloned = cloneTemplate(getTenantId(request), id, name, getUserId(request));
    if (!cloned) {
      reply.code(404);
      return { ok: false, error: "source_template_not_found" };
    }
    reply.code(201);
    return { ok: true, template: cloned };
  });

  app.delete("/hl7/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteTemplate(getTenantId(request), id);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: "template_not_found_or_not_draft" };
    }
    return { ok: true, deleted: true };
  });

  // ─── Validation ──────────────────────────────────────────────────

  app.post("/hl7/templates/:id/validate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const rawMessage = body.message || body.hl7;
    if (!rawMessage) {
      reply.code(400);
      return { ok: false, error: "message (raw HL7v2) is required" };
    }
    const template = getTemplate(getTenantId(request), id);
    if (!template) {
      reply.code(404);
      return { ok: false, error: "template_not_found" };
    }
    const parsed = parseMessage(rawMessage);
    if (!parsed) {
      reply.code(400);
      return { ok: false, error: "invalid_hl7_message" };
    }
    const result = validateAgainstTemplate(parsed, template);
    return { ok: true, validation: result };
  });

  app.get("/hl7/templates/:id/conformance", async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = getTemplate(getTenantId(request), id);
    if (!template) {
      reply.code(404);
      return { ok: false, error: "template_not_found" };
    }
    const summary = getConformanceSummary(template);
    return { ok: true, conformance: summary };
  });
}
