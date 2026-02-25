/**
 * posture/index.ts -- Phase 107: Production Posture Pack
 *
 * Aggregates all production posture checks into a unified endpoint.
 * All posture routes require admin auth (matched by /posture/* in AUTH_RULES).
 *
 * Routes:
 *   GET /posture              -- Unified posture report (all domains)
 *   GET /posture/observability -- Observability gates only
 *   GET /posture/tenant       -- Tenant isolation gates only
 *   GET /posture/performance  -- Performance gates only
 *   GET /posture/backup       -- Backup/restore gates only
 */

import type { FastifyInstance } from "fastify";
import { checkObservabilityPosture } from "./observability-posture.js";
import { checkTenantIsolationPosture } from "./tenant-posture.js";
import { checkPerfPosture } from "./perf-posture.js";
import { checkBackupPosture } from "./backup-posture.js";
import { checkDataPlanePosture } from "./data-plane-posture.js";

export default async function postureRoutes(server: FastifyInstance) {
  // Unified posture report
  server.get("/posture", async () => {
    const [observability, tenant, performance, backup] = await Promise.all([
      checkObservabilityPosture(),
      checkTenantIsolationPosture(),
      checkPerfPosture(),
      checkBackupPosture(),
    ]);
    const dataPlane = checkDataPlanePosture();

    const totalGates = [
      ...observability.gates,
      ...tenant.gates,
      ...performance.gates,
      ...backup.gates,
      ...dataPlane.gates,
    ];
    const passCount = totalGates.filter((g) => g.pass).length;
    const totalScore = Math.round((passCount / totalGates.length) * 100);

    return {
      ok: true,
      score: totalScore,
      summary: `${passCount}/${totalGates.length} total gates pass (score: ${totalScore})`,
      domains: {
        observability,
        tenant,
        performance,
        backup,
        dataPlane,
      },
      timestamp: new Date().toISOString(),
    };
  });

  // Individual domain endpoints
  server.get("/posture/observability", async () => {
    return { ok: true, ...(await checkObservabilityPosture()) };
  });

  server.get("/posture/tenant", async () => {
    return { ok: true, ...(await checkTenantIsolationPosture()) };
  });

  // Phase 122: Dedicated admin tenant posture endpoint
  server.get("/admin/tenant-posture", async () => {
    const posture = await checkTenantIsolationPosture();
    return {
      ok: true,
      pgEnabled: posture.pgActive,
      rlsEnabled: posture.rlsEnabled,
      enforcementMode: posture.enforcementMode,
      score: posture.score,
      gates: posture.gates,
      rlsTables: posture.rlsTables,
      timestamp: new Date().toISOString(),
    };
  });

  server.get("/posture/performance", async () => {
    return { ok: true, ...checkPerfPosture() };
  });

  server.get("/posture/backup", async () => {
    return { ok: true, ...checkBackupPosture() };
  });

  // Phase 125: Data plane posture
  server.get("/posture/data-plane", async () => {
    return { ok: true, ...checkDataPlanePosture() };
  });
}
