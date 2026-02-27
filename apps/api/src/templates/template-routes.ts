/**
 * Phase 158: Template Routes — CRUD, versioning, note builder, quick text.
 * Fastify plugin for /admin/templates/* and /encounter/note-builder/* endpoints.
 *
 * Auth: /admin/templates/* requires admin role
 *       /encounter/note-builder/* requires session
 *       /templates/specialty-packs is session-level (read-only catalog)
 */

import type { FastifyInstance } from "fastify";
import {
  createTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  getTemplate,
  listTemplates,
  getVersionHistory,
  createQuickText,
  listQuickTexts,
  updateQuickText,
  deleteQuickText,
  generateDraftNote,
  seedSpecialtyPack,
  getTemplateStats,
} from "./template-engine.js";
import { getAllSpecialtyPacks } from "./specialty-packs.js";
import { SPECIALTY_TAGS } from "./types.js";

export default async function templateRoutes(server: FastifyInstance): Promise<void> {
  // ─── Admin Template Management ────────────────────────────────

  // List templates with optional filters
  server.get("/admin/templates", async (request, reply) => {
    const q = request.query as any;
    const tenantId = (request as any).tenantId || "default";
    const templates = await listTemplates(tenantId, {
      specialty: q.specialty,
      setting: q.setting,
      status: q.status,
      search: q.search,
    });
    return { ok: true, templates, count: templates.length };
  });

  // Get single template
  server.get("/admin/templates/:id", async (request, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).tenantId || "default";
    const template = await getTemplate(tenantId, id);
    if (!template) {
      reply.code(404);
      return { ok: false, error: "Template not found" };
    }
    return { ok: true, template };
  });

  // Create template
  server.post("/admin/templates", async (request, reply) => {
    const body = (request.body as any) || {};
    const tenantId = (request as any).tenantId || "default";
    const actor = (request as any).session?.userName || "system";

    if (!body.name || !body.specialty) {
      reply.code(400);
      return { ok: false, error: "name and specialty are required" };
    }

    const template = await createTemplate(tenantId, {
      name: body.name,
      specialty: body.specialty,
      setting: body.setting || "any",
      description: body.description,
      tags: body.tags,
      sections: body.sections || [],
      quickInsertSections: body.quickInsertSections,
      autoExpandRules: body.autoExpandRules,
    }, actor);

    reply.code(201);
    return { ok: true, template };
  });

  // Update template
  server.put("/admin/templates/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = (request as any).tenantId || "default";
    const actor = (request as any).session?.userName || "system";

    const updated = await updateTemplate(tenantId, id, {
      name: body.name,
      description: body.description,
      specialty: body.specialty,
      setting: body.setting,
      tags: body.tags,
      sections: body.sections,
      quickInsertSections: body.quickInsertSections,
      autoExpandRules: body.autoExpandRules,
    }, actor);

    if (!updated) {
      reply.code(404);
      return { ok: false, error: "Template not found or archived" };
    }
    return { ok: true, template: updated };
  });

  // Publish template
  server.post("/admin/templates/:id/publish", async (request, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).tenantId || "default";
    const actor = (request as any).session?.userName || "system";

    const published = await publishTemplate(tenantId, id, actor);
    if (!published) {
      reply.code(404);
      return { ok: false, error: "Template not found" };
    }
    return { ok: true, template: published };
  });

  // Archive template
  server.post("/admin/templates/:id/archive", async (request, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).tenantId || "default";
    const actor = (request as any).session?.userName || "system";

    const archived = await archiveTemplate(tenantId, id, actor);
    if (!archived) {
      reply.code(404);
      return { ok: false, error: "Template not found" };
    }
    return { ok: true, template: archived };
  });

  // Version history
  server.get("/admin/templates/:id/versions", async (request, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).tenantId || "default";
    const events = await getVersionHistory(tenantId, id);
    return { ok: true, events, count: events.length };
  });

  // Template stats
  server.get("/admin/templates/stats", async (request, reply) => {
    const tenantId = (request as any).tenantId || "default";
    const stats = getTemplateStats(tenantId);
    return { ok: true, ...stats };
  });

  // Seed specialty packs
  server.post("/admin/templates/seed", async (request, reply) => {
    const tenantId = (request as any).tenantId || "default";
    const body = (request.body as any) || {};
    const specialty = body.specialty; // optional: seed only one specialty

    const allPacks = getAllSpecialtyPacks();
    let totalSeeded = 0;

    for (const pack of allPacks) {
      if (specialty && pack.specialty !== specialty) continue;
      const count = await seedSpecialtyPack(tenantId, { templates: pack.templates });
      totalSeeded += count;
    }

    return { ok: true, seeded: totalSeeded, specialties: specialty ? 1 : allPacks.length };
  });

  // ─── Quick Text CRUD ──────────────────────────────────────────

  server.get("/admin/templates/quick-text", async (request, reply) => {
    const q = request.query as any;
    const tenantId = (request as any).tenantId || "default";
    const items = await listQuickTexts(tenantId, {
      tag: q.tag,
      specialty: q.specialty,
      search: q.search,
    });
    return { ok: true, quickTexts: items, count: items.length };
  });

  server.post("/admin/templates/quick-text", async (request, reply) => {
    const body = (request.body as any) || {};
    const tenantId = (request as any).tenantId || "default";

    if (!body.key || !body.text) {
      reply.code(400);
      return { ok: false, error: "key and text are required" };
    }

    const qt = await createQuickText(tenantId, {
      key: body.key,
      text: body.text,
      tags: body.tags || [],
      specialty: body.specialty,
      createdBy: (request as any).session?.userName,
    });

    reply.code(201);
    return { ok: true, quickText: qt };
  });

  server.put("/admin/templates/quick-text/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = (request as any).tenantId || "default";

    const updated = await updateQuickText(tenantId, id, {
      text: body.text,
      tags: body.tags,
      specialty: body.specialty,
    });

    if (!updated) {
      reply.code(404);
      return { ok: false, error: "Quick text not found" };
    }
    return { ok: true, quickText: updated };
  });

  server.delete("/admin/templates/quick-text/:id", async (request, reply) => {
    const { id } = request.params as any;
    const tenantId = (request as any).tenantId || "default";
    const deleted = await deleteQuickText(tenantId, id);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: "Quick text not found" };
    }
    return { ok: true };
  });

  // ─── Specialty Pack Catalog (read-only, session auth) ─────────

  server.get("/templates/specialty-packs", async (request, reply) => {
    const packs = getAllSpecialtyPacks();
    return {
      ok: true,
      packs: packs.map((p) => ({
        specialty: p.specialty,
        templateCount: p.templates.length,
        templateNames: p.templates.map((t) => t.name),
      })),
      totalSpecialties: packs.length,
      specialtyTags: [...SPECIALTY_TAGS],
    };
  });

  // ─── Note Builder ─────────────────────────────────────────────

  server.post("/encounter/note-builder/generate", async (request, reply) => {
    const body = (request.body as any) || {};

    if (!body.templateId) {
      reply.code(400);
      return { ok: false, error: "templateId is required" };
    }

    const result = await generateDraftNote({
      templateId: body.templateId,
      fieldValues: body.fieldValues || {},
      dfn: body.dfn,
      duz: (request as any).session?.duz,
      tiuTitleIen: body.tiuTitleIen,
    });

    if (!result.draftText && result.sectionsRendered === 0) {
      reply.code(404);
      return { ok: false, error: "Template not found" };
    }

    return { ok: true, ...result };
  });
}
