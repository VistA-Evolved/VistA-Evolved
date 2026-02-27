/**
 * Phase 155 -- VistA Routine Provisioning Status
 *
 * GET /vista/provision/status (admin-only)
 *
 * Reports which ZVE* M routines are installed in the connected VistA instance,
 * which custom RPCs are registered, and overall provisioning health.
 *
 * This is a read-only introspection endpoint. It does NOT install anything.
 * To install routines, run: scripts/install-vista-routines.ps1
 *
 * Auth: admin (enforced by AUTH_RULES pattern in security.ts).
 */

import type { FastifyInstance } from "fastify";
import { optionalRpc, getCapabilities } from "../vista/rpcCapabilities.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Provisioning manifest: what SHOULD be installed                     */
/* ------------------------------------------------------------------ */

interface RoutineManifest {
  routine: string;
  file: string;
  installer: string;
  rpcs: string[];
  phase: string;
  description: string;
}

const PROVISIONING_MANIFEST: RoutineManifest[] = [
  {
    routine: "ZVEMIOP",
    file: "ZVEMIOP.m",
    installer: "RUN^ZVEMINS",
    rpcs: [
      "VE INTEROP HL7 LINKS",
      "VE INTEROP HL7 MSGS",
      "VE INTEROP HLO STATUS",
      "VE INTEROP QUEUE DEPTH",
      "VE INTEROP MSG LIST",
      "VE INTEROP MSG DETAIL",
    ],
    phase: "21",
    description: "HL7/HLO interop monitor (6 read-only RPCs)",
  },
  {
    routine: "ZVEMSGR",
    file: "ZVEMSGR.m",
    installer: "EN^ZVEMSIN",
    rpcs: [
      "ZVE MAIL FOLDERS",
      "ZVE MAIL LIST",
      "ZVE MAIL GET",
      "ZVE MAIL SEND",
      "ZVE MAIL MANAGE",
    ],
    phase: "70",
    description: "MailMan RPC bridge (5 RPCs)",
  },
  {
    routine: "ZVERPC",
    file: "ZVERPC.m",
    installer: "INSTALL^ZVERPC",
    rpcs: ["VE LIST RPCS"],
    phase: "37B",
    description: "RPC catalog lister",
  },
  {
    routine: "ZVERCMP",
    file: "ZVERCMP.m",
    installer: "INSTALL^ZVERCMP",
    rpcs: ["VE RCM PROVIDER INFO"],
    phase: "42",
    description: "RCM provider info wrapper",
  },
  {
    routine: "ZVEADT",
    file: "ZVEADT.m",
    installer: "INSTALL^ZVEADT",
    rpcs: ["ZVEADT WARDS", "ZVEADT BEDS", "ZVEADT MVHIST"],
    phase: "137",
    description: "ADT ward census/bed board (3 RPCs)",
  },
];

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function vistaProvisionRoutes(
  server: FastifyInstance,
): Promise<void> {
  /**
   * GET /vista/provision/status
   *
   * Returns the provisioning manifest with live RPC capability status.
   * Each routine entry includes:
   *   - routine name and description
   *   - expected RPCs
   *   - per-RPC availability status (checked via optionalRpc)
   *   - overall health (all RPCs available = "installed", some = "partial", none = "missing")
   */
  server.get("/vista/provision/status", async (request) => {
    const routines = PROVISIONING_MANIFEST.map((m) => {
      const rpcStatus = m.rpcs.map((rpcName) => {
        const check = optionalRpc(rpcName);
        return {
          rpc: rpcName,
          available: check.available,
        };
      });

      const availableCount = rpcStatus.filter((r) => r.available).length;
      const totalCount = rpcStatus.length;
      let health: "installed" | "partial" | "missing" = "missing";
      if (availableCount === totalCount) health = "installed";
      else if (availableCount > 0) health = "partial";

      return {
        routine: m.routine,
        file: m.file,
        installer: m.installer,
        description: m.description,
        phase: m.phase,
        health,
        rpcsAvailable: availableCount,
        rpcsTotal: totalCount,
        rpcs: rpcStatus,
      };
    });

    const totalRoutines = routines.length;
    const installedCount = routines.filter((r) => r.health === "installed").length;
    const partialCount = routines.filter((r) => r.health === "partial").length;
    const missingCount = routines.filter((r) => r.health === "missing").length;

    const cap = getCapabilities();
    const cacheWarmed = cap !== null;

    // When capability cache hasn't been warmed yet, optionalRpc() returns
    // available:true for everything (graceful degradation). Report "unknown"
    // instead of a falsely optimistic "fully-provisioned".
    const overallHealth = !cacheWarmed
      ? "unknown"
      : missingCount === 0 && partialCount === 0
        ? "fully-provisioned"
        : missingCount === totalRoutines
          ? "unprovisioned"
          : "partially-provisioned";

    log.info("Provisioning status requested", {
      overallHealth,
      installed: installedCount,
      partial: partialCount,
      missing: missingCount,
    });

    return {
      ok: true,
      overallHealth,
      cacheWarmed,
      lastDiscovery: cap?.discoveredAt ?? null,
      summary: {
        totalRoutines,
        installed: installedCount,
        partial: partialCount,
        missing: missingCount,
      },
      installCommand: "scripts/install-vista-routines.ps1",
      routines,
    };
  });

  log.info("VistA provisioning status route registered (Phase 155)", {
    routes: ["GET /vista/provision/status"],
  });
}
