/**
 * Department Pack Routes — Phase 349
 *
 * Admin endpoints for browsing, validating, installing, and uninstalling
 * department packs. Read endpoints available to session users.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  loadPackManifests,
  getPack,
  listPacks,
  validatePack,
  installPack,
  uninstallPack,
  listInstallations,
  getInstallation,
  resolveEffectiveFlags,
} from "../services/dept-pack-service.js";

export async function deptPackRoutes(server: FastifyInstance): Promise<void> {
  const tenantId = "default";

  // Load manifests at registration time
  loadPackManifests();

  // ─── Pack Catalog (read) ─────────────────────────────

  server.get("/dept-packs/catalog", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentType } = (req.query as any) || {};
    return reply.send({ ok: true, packs: listPacks(departmentType) });
  });

  server.get("/dept-packs/catalog/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const pack = getPack(id);
    if (!pack) {
      return reply.code(404).send({ ok: false, error: "Pack not found" });
    }
    return reply.send({ ok: true, pack });
  });

  // ─── Validation ──────────────────────────────────────

  server.post("/dept-packs/validate", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.packId) {
      return reply.code(400).send({ ok: false, error: "packId is required" });
    }
    const result = validatePack(body.packId, body.installedModules || []);
    return reply.send({ ok: true, validation: result });
  });

  // ─── Installation Management ─────────────────────────

  server.get("/dept-packs/installations", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId } = (req.query as any) || {};
    return reply.send({
      ok: true,
      installations: listInstallations(tenantId, departmentId),
    });
  });

  server.get("/dept-packs/installations/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const inst = getInstallation(id);
    if (!inst || inst.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Installation not found" });
    }
    return reply.send({ ok: true, installation: inst });
  });

  server.post("/dept-packs/install", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.departmentId || !body.packId || !body.installedBy) {
      return reply.code(400).send({
        ok: false,
        error: "departmentId, packId, and installedBy are required",
      });
    }
    const result = installPack(
      tenantId,
      body.departmentId,
      body.packId,
      body.installedBy,
      body.flagOverrides,
    );
    if ("error" in result) {
      return reply.code(409).send({ ok: false, error: result.error });
    }
    return reply.code(201).send({ ok: true, installation: result });
  });

  server.post("/dept-packs/uninstall/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ok = uninstallPack(id);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Installation not found or already uninstalled" });
    }
    return reply.send({ ok: true, uninstalled: true });
  });

  // ─── Effective Flags ─────────────────────────────────

  server.get("/dept-packs/effective-flags", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId } = (req.query as any) || {};
    if (!departmentId) {
      return reply.code(400).send({ ok: false, error: "departmentId query param is required" });
    }
    return reply.send({
      ok: true,
      departmentId,
      flags: resolveEffectiveFlags(tenantId, departmentId),
    });
  });

  // ─── Reload Manifests ────────────────────────────────

  server.post("/dept-packs/reload", async (_req: FastifyRequest, reply: FastifyReply) => {
    const packs = loadPackManifests();
    return reply.send({ ok: true, loaded: packs.length });
  });
}

export default deptPackRoutes;
