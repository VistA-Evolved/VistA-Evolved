/**
 * Data Plane Posture — Phase 125: Postgres-Only Production Data Plane
 *
 * Production readiness gates for the data plane:
 *   Gate 1: Runtime mode is set and recognized
 *   Gate 2: PG is connected (required in rc/prod)
 *   Gate 3: RLS is active on all tenant-scoped tables (required in rc/prod)
 *   Gate 4: Store backend resolves to "pg" (required in rc/prod)
 *   Gate 5: No SQLite runtime path active (required in rc/prod)
 *   Gate 6: JSON mutable file stores blocked (required in rc/prod)
 */

import { getRuntimeMode, requiresPg, allowsSqlite, blocksJsonStores, requiresOidc } from "../platform/runtime-mode.js";
import { isPgConfigured } from "../platform/pg/pg-db.js";
import { resolveBackend } from "../platform/store-resolver.js";

interface PostureGate {
  name: string;
  pass: boolean;
  detail: string;
  severity: "critical" | "warning" | "info";
}

export interface DataPlanePosture {
  domain: "data-plane";
  score: number;
  gates: PostureGate[];
  runtimeMode: string;
  pgConfigured: boolean;
  storeBackend: string;
  pgRequired: boolean;
}

export function checkDataPlanePosture(): DataPlanePosture {
  const mode = getRuntimeMode();
  const pgRequired = requiresPg();
  const pgActive = isPgConfigured();
  const sqliteAllowed = allowsSqlite();
  const jsonBlocked = blocksJsonStores();

  let storeBackend = "unknown";
  try {
    storeBackend = resolveBackend();
  } catch {
    storeBackend = "error";
  }

  const gates: PostureGate[] = [];

  // Gate 1: Runtime mode recognized
  gates.push({
    name: "runtime_mode",
    pass: ["dev", "test", "rc", "prod"].includes(mode),
    detail: `PLATFORM_RUNTIME_MODE=${mode}`,
    severity: "info",
  });

  // Gate 2: PG connected (critical in rc/prod)
  gates.push({
    name: "pg_connected",
    pass: pgActive,
    detail: pgActive
      ? "PostgreSQL configured and available"
      : pgRequired
        ? "PostgreSQL NOT configured -- REQUIRED in " + mode + " mode"
        : "PostgreSQL not configured (optional in " + mode + " mode)",
    severity: pgRequired && !pgActive ? "critical" : pgActive ? "info" : "warning",
  });

  // Gate 3: Store backend is PG (critical in rc/prod)
  const backendOk = storeBackend === "pg" || (!pgRequired && storeBackend === "sqlite");
  gates.push({
    name: "store_backend",
    pass: backendOk,
    detail: `Store backend: ${storeBackend}` + (pgRequired && storeBackend !== "pg" ? " -- must be pg in " + mode : ""),
    severity: pgRequired && storeBackend !== "pg" ? "critical" : "info",
  });

  // Gate 4: No SQLite in rc/prod
  const noSqlite = !sqliteAllowed ? storeBackend !== "sqlite" : true;
  gates.push({
    name: "no_sqlite_runtime",
    pass: noSqlite,
    detail: sqliteAllowed
      ? "SQLite allowed in " + mode + " mode (dev/test)"
      : noSqlite
        ? "SQLite runtime blocked in " + mode + " mode"
        : "SQLite runtime ACTIVE -- not allowed in " + mode + " mode",
    severity: !noSqlite ? "critical" : "info",
  });

  // Gate 5: JSON mutable stores blocked (critical in rc/prod)
  gates.push({
    name: "json_stores_blocked",
    pass: jsonBlocked || !pgRequired,
    detail: jsonBlocked
      ? "JSON mutable file stores blocked in " + mode + " mode"
      : pgRequired
        ? "JSON mutable file stores NOT blocked -- should be in " + mode
        : "JSON mutable file stores allowed in " + mode + " mode (dev/test)",
    severity: pgRequired && !jsonBlocked ? "critical" : "info",
  });

  // Gate 6: RLS enforcement alignment
  const rlsExplicit = process.env.PLATFORM_PG_RLS_ENABLED;
  const rlsAutoEnabled = pgActive && pgRequired;
  const rlsReady = rlsExplicit === "true" || rlsAutoEnabled || !pgRequired;
  gates.push({
    name: "rls_enforcement",
    pass: rlsReady,
    detail: rlsExplicit === "true"
      ? "RLS explicitly enabled via PLATFORM_PG_RLS_ENABLED=true"
      : rlsAutoEnabled
        ? "RLS auto-enabled for " + mode + " + PG"
        : pgRequired
          ? "RLS not configured for " + mode + " mode"
          : "RLS optional in " + mode + " mode",
    severity: pgRequired && !rlsReady ? "critical" : "info",
  });

  // Gate 7 (Phase 150): OIDC enforcement
  const oidcRequired = requiresOidc();
  const oidcEnabled = process.env.OIDC_ENABLED === "true";
  const oidcIssuerSet = !!process.env.OIDC_ISSUER;
  const oidcOk = oidcEnabled && oidcIssuerSet;
  gates.push({
    name: "oidc_enforcement",
    pass: oidcOk || !oidcRequired,
    detail: oidcRequired
      ? oidcOk
        ? "OIDC enabled with issuer " + process.env.OIDC_ISSUER
        : "OIDC NOT configured -- REQUIRED in " + mode + " mode"
      : oidcOk
        ? "OIDC enabled (optional in " + mode + " mode)"
        : "OIDC not enabled (optional in " + mode + " mode)",
    severity: oidcRequired && !oidcOk ? "critical" : "info",
  });

  const passCount = gates.filter((g) => g.pass).length;
  const score = Math.round((passCount / gates.length) * 100);

  return {
    domain: "data-plane",
    score,
    gates,
    runtimeMode: mode,
    pgConfigured: pgActive,
    storeBackend,
    pgRequired,
  };
}
