/**
 * PH HMO Routes — Phase 93: PH HMO Deepening Pack
 *
 * REST endpoints for the canonical PH HMO registry:
 *   GET /rcm/payers/ph/hmos          — list all 27 HMOs (filterable)
 *   GET /rcm/payers/ph/hmos/stats    — registry stats + coverage summary
 *   GET /rcm/payers/ph/hmos/validate — registry validation report
 *   GET /rcm/payers/ph/hmos/:payerId — single HMO detail with capabilities
 *
 * Auth: session-level (matched by /rcm/ catch-all in AUTH_RULES).
 * No additional auth config needed.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  initPhHmoRegistry,
  getPhHmo,
  listPhHmos,
  getPhHmoStats,
  getPhHmoMeta,
  getPhHmoRegistryValidation,
} from "../payers/ph-hmo-registry.js";
import {
  createLoaRequestPacket,
  createClaimPacket,
  getAdapterCapabilityReport,
} from "../payers/ph-hmo-adapter.js";

let registryReady = false;

const phHmoRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /* ── Init on first request ──────────────────────────────── */
  if (!registryReady) {
    const result = initPhHmoRegistry();
    registryReady = true;
    if (!result.valid) {
      server.log.warn(`PH HMO registry init warnings: ${result.errors.join("; ")}`);
    }
  }

  /* ── GET /rcm/payers/ph/hmos — list all HMOs ──────────── */
  server.get("/rcm/payers/ph/hmos", async (request, reply) => {
    const query = request.query as {
      status?: string;
      integrationMode?: string;
      search?: string;
    };

    const hmos = listPhHmos({
      status: query.status as any,
      integrationMode: query.integrationMode as any,
      search: query.search,
    });

    const meta = getPhHmoMeta();

    return reply.send({
      ok: true,
      count: hmos.length,
      canonicalSource: meta?.canonicalSource ?? null,
      lastUpdated: meta?.lastUpdated ?? null,
      hmos,
    });
  });

  /* ── GET /rcm/payers/ph/hmos/stats — summary stats ────── */
  server.get("/rcm/payers/ph/hmos/stats", async (_request, reply) => {
    const stats = getPhHmoStats();
    const meta = getPhHmoMeta();

    return reply.send({
      ok: true,
      canonicalSource: meta?.canonicalSource ?? null,
      stats,
    });
  });

  /* ── GET /rcm/payers/ph/hmos/validate — validation ────── */
  server.get("/rcm/payers/ph/hmos/validate", async (_request, reply) => {
    const validation = getPhHmoRegistryValidation();

    return reply.send({
      ok: validation.valid,
      validation,
    });
  });

  /* ── GET /rcm/payers/ph/hmos/:payerId — single HMO ──── */
  server.get("/rcm/payers/ph/hmos/:payerId", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const hmo = getPhHmo(payerId);

    if (!hmo) {
      return reply.code(404).send({
        ok: false,
        error: `HMO not found: ${payerId}`,
        hint: "Use GET /rcm/payers/ph/hmos to list all available HMOs",
      });
    }

    return reply.send({
      ok: true,
      hmo,
    });
  });

  /* ── GET /rcm/payers/ph/hmos/:payerId/loa-packet ────── */
  server.get("/rcm/payers/ph/hmos/:payerId/loa-packet", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const packet = createLoaRequestPacket(payerId);

    if (!packet) {
      return reply.code(404).send({
        ok: false,
        error: `HMO not found: ${payerId}`,
      });
    }

    return reply.send({ ok: true, packet });
  });

  /* ── GET /rcm/payers/ph/hmos/:payerId/claim-packet ──── */
  server.get("/rcm/payers/ph/hmos/:payerId/claim-packet", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const packet = createClaimPacket(payerId);

    if (!packet) {
      return reply.code(404).send({
        ok: false,
        error: `HMO not found: ${payerId}`,
      });
    }

    return reply.send({ ok: true, packet });
  });

  /* ── GET /rcm/payers/ph/hmos/:payerId/capabilities ──── */
  server.get("/rcm/payers/ph/hmos/:payerId/capabilities", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const report = getAdapterCapabilityReport(payerId);

    if (!report) {
      return reply.code(404).send({
        ok: false,
        error: `HMO not found: ${payerId}`,
      });
    }

    return reply.send({ ok: true, report });
  });
};

export default phHmoRoutes;
