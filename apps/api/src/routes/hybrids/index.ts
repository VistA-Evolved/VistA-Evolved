/**
 * hybrids/index.ts -- Phase 541 (Wave 39, P11)
 *
 * VA/IHS GUI Hybrids Capability Map endpoints.
 * Serves the pre-built cross-reference data from va-gui-hybrids-map.json.
 *
 * Routes:
 *   GET /vista/hybrids/map      -- full hybrid map (all systems with RPC overlap/gap)
 *   GET /vista/hybrids/summary  -- rollup summary with per-system readiness scores
 */

import { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cache the loaded data to avoid re-reading on every request
let cachedMap: any = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function loadHybridsMap(): any {
  const now = Date.now();
  if (cachedMap && (now - cacheLoadedAt) < CACHE_TTL_MS) {
    return cachedMap;
  }

  // Try multiple paths (monorepo root resolution)
  const candidates = [
    join(__dirname, '..', '..', '..', '..', 'data', 'ui-estate', 'va-gui-hybrids-map.json'),
    join(process.cwd(), 'data', 'ui-estate', 'va-gui-hybrids-map.json'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, 'utf8');
        const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
        cachedMap = JSON.parse(clean);
        cacheLoadedAt = now;
        return cachedMap;
      } catch { /* try next */ }
    }
  }

  return null;
}

export default async function hybridsRoutes(server: FastifyInstance) {
  // GET /vista/hybrids/map -- full cross-reference map
  server.get('/vista/hybrids/map', async (_request, reply) => {
    const data = loadHybridsMap();
    if (!data) {
      return reply.code(503).send({
        ok: false,
        error: 'Hybrids map not generated. Run: node scripts/ui-estate/build-hybrids-map.mjs',
      });
    }
    return { ok: true, ...data };
  });

  // GET /vista/hybrids/summary -- rollup with per-system scores
  server.get('/vista/hybrids/summary', async (_request, reply) => {
    const data = loadHybridsMap();
    if (!data) {
      return reply.code(503).send({
        ok: false,
        error: 'Hybrids map not generated. Run: node scripts/ui-estate/build-hybrids-map.mjs',
      });
    }

    // Build compact summary with per-hybrid readiness
    const systems = (data.hybrids || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      agency: h.agency,
      category: h.category,
      hostPlatform: h.hostPlatform,
      deploymentModel: h.deploymentModel,
      migrationStrategy: h.migrationStrategy,
      surfaceCount: h.surfaceCount,
      coveredSurfaces: h.coveredSurfaces,
      rpcOverlapCount: h.rpcOverlap?.length || 0,
      rpcGapCount: h.rpcGap?.length || 0,
      capabilityOverlapCount: h.capabilityOverlap?.length || 0,
      migrationReadiness: h.migrationReadiness,
    }));

    return {
      ok: true,
      summary: data.summary,
      systems,
    };
  });
}

export { hybridsRoutes };
