/**
 * RPC Capability Discovery routes — Phase 14A.
 *
 * GET /vista/rpc-capabilities — returns cached map of available RPCs
 *   ?refresh=true — force re-probe
 *   ?domain=orders — filter by domain
 *
 * Used by:
 *   - UI to show feature availability
 *   - Verifier script to classify missing RPCs as expected vs unexpected
 *   - Write-back endpoints to decide real vs draft mode
 */

import type { FastifyInstance } from "fastify";
import {
  discoverCapabilities,
  getDomainCapabilities,
  buildRuntimeMatrix,
  compareToBaseline,
  KNOWN_RPCS,
} from "../vista/rpcCapabilities.js";

export default async function capabilityRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /vista/rpc-capabilities
   *
   * Response:
   * {
   *   ok: true,
   *   instanceId: "worldvista-docker",
   *   discoveredAt: "ISO",
   *   totalProbed: 40,
   *   available: 25,
   *   missing: 15,
   *   expectedMissing: 12,
   *   unexpectedMissing: 3,
   *   rpcs: { "ORWPT LIST ALL": { available: true, ... }, ... },
   *   domains: { "orders": { readAvailable: true, writeAvailable: false, ... } },
   *   knownRpcCount: 40,
   * }
   */
  server.get("/vista/rpc-capabilities", async (request, reply) => {
    const { refresh, domain } = request.query as { refresh?: string; domain?: string };

    try {
      const caps = await discoverCapabilities(refresh === "true");

      // Optional domain filter
      if (domain) {
        const domainCaps = getDomainCapabilities(domain);
        return {
          ok: true,
          instanceId: caps.instanceId,
          discoveredAt: caps.discoveredAt,
          domain: domainCaps,
        };
      }

      // Build domain summaries
      const domainNames = [...new Set(KNOWN_RPCS.map((r) => r.domain))];
      const domains: Record<string, ReturnType<typeof getDomainCapabilities>> = {};
      for (const d of domainNames) {
        domains[d] = getDomainCapabilities(d);
      }

      const unexpectedMissing = caps.missingList.filter(
        (r) => !caps.expectedMissing.includes(r)
      );

      return {
        ok: true,
        instanceId: caps.instanceId,
        discoveredAt: caps.discoveredAt,
        totalProbed: Object.keys(caps.rpcs).length,
        available: caps.availableList.length,
        missing: caps.missingList.length,
        expectedMissing: caps.expectedMissing.length,
        unexpectedMissing: unexpectedMissing.length,
        unexpectedMissingList: unexpectedMissing,
        rpcs: caps.rpcs,
        domains,
        knownRpcCount: KNOWN_RPCS.length,
      };
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: "Capability probe failed" });
    }
  });

  /**
   * GET /vista/runtime-matrix — Phase 425
   *
   * Returns combined domain capability view with adapter + RPC readiness.
   * Requires prior capability discovery (calls discoverCapabilities if needed).
   */
  server.get("/vista/runtime-matrix", async (_request, reply) => {
    try {
      // Ensure we have discovered capabilities
      await discoverCapabilities();
      const matrix = buildRuntimeMatrix();
      return { ok: true, ...matrix };
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: "Runtime matrix build failed" });
    }
  });

  /**
   * POST /vista/runtime-matrix/drift — Phase 425
   *
   * Compare current capabilities against provided baseline.
   * Body: { availableList: string[], missingList: string[], instanceId?: string }
   */
  server.post("/vista/runtime-matrix/drift", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.availableList || !Array.isArray(body.availableList)) {
      return reply.code(400).send({ ok: false, error: "Request body must include availableList array" });
    }

    try {
      await discoverCapabilities();
      const report = compareToBaseline(body);
      if (!report) {
        return reply.code(503).send({ ok: false, error: "No capability data available" });
      }
      return { ok: true, ...report };
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: "Drift comparison failed" });
    }
  });
}
