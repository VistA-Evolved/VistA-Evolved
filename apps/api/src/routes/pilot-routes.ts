/**
 * Pilot Routes — Phase 246: Pilot Hospital Hardening
 *
 * Routes:
 *   GET  /admin/pilot/sites             — List all pilot sites
 *   POST /admin/pilot/sites             — Create a new pilot site
 *   GET  /admin/pilot/sites/:id         — Get site detail
 *   PATCH /admin/pilot/sites/:id        — Update site config
 *   DELETE /admin/pilot/sites/:id       — Delete site
 *   POST /admin/pilot/sites/:id/preflight — Run preflight checks
 *   GET  /admin/pilot/summary           — Summary stats
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import {
  createSite,
  getSite,
  listSites,
  updateSite,
  deleteSite,
  getSiteSummary,
  type CreateSiteRequest,
} from "../pilot/site-config.js";
import { runPreflightChecks } from "../pilot/preflight.js";

export default async function pilotRoutes(server: FastifyInstance): Promise<void> {

  /* ── GET /admin/pilot/sites ─────────────────────────────────── */
  server.get("/admin/pilot/sites", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const sites = listSites();
    return { ok: true, sites };
  });

  /* ── POST /admin/pilot/sites ────────────────────────────────── */
  server.post("/admin/pilot/sites", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const body = (request.body as any) || {};
    if (!body.name || !body.code) {
      return reply.code(400).send({ ok: false, error: "name and code are required" });
    }

    try {
      const site = createSite(body as CreateSiteRequest);
      return { ok: true, site };
    } catch (err: any) {
      return reply.code(409).send({ ok: false, error: err.message });
    }
  });

  /* ── GET /admin/pilot/sites/:id ─────────────────────────────── */
  server.get("/admin/pilot/sites/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { id } = request.params as { id: string };
    const site = getSite(id);
    if (!site) return reply.code(404).send({ ok: false, error: "Site not found" });

    return { ok: true, site };
  });

  /* ── PATCH /admin/pilot/sites/:id ───────────────────────────── */
  server.patch("/admin/pilot/sites/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    try {
      const site = updateSite(id, body);
      return { ok: true, site };
    } catch (err: any) {
      return reply.code(404).send({ ok: false, error: err.message });
    }
  });

  /* ── DELETE /admin/pilot/sites/:id ──────────────────────────── */
  server.delete("/admin/pilot/sites/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { id } = request.params as { id: string };
    const deleted = deleteSite(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Site not found" });

    return { ok: true };
  });

  /* ── POST /admin/pilot/sites/:id/preflight ──────────────────── */
  server.post("/admin/pilot/sites/:id/preflight", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { id } = request.params as { id: string };
    const site = getSite(id);
    if (!site) return reply.code(404).send({ ok: false, error: "Site not found" });

    const result = await runPreflightChecks(site);

    // Update site with preflight score
    try {
      updateSite(id, {
        lastPreflightScore: result.score,
        status: result.readiness === "ready" ? "ready" : "preflight",
      });
    } catch { /* site may have been deleted between check and update */ }

    return { ok: true, preflight: result };
  });

  /* ── GET /admin/pilot/summary ───────────────────────────────── */
  server.get("/admin/pilot/summary", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const summary = getSiteSummary();
    return { ok: true, summary };
  });
}
