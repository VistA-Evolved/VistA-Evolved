#!/usr/bin/env node
/**
 * G12 -- Data Plane Gate (Phase 125, extended Phase 150, Phase 153)
 *
 * Validates the Postgres-only production data plane contract:
 *   1. runtime-mode.ts module exists with required exports
 *   2. store-resolver.ts enforces PG in rc/prod modes
 *   3. data-plane-posture.ts exists and exports checkDataPlanePosture
 *   4. payer-persistence.ts guards JSON writes with blocksJsonStores()
 *   5. pg-migrate.ts auto-enables RLS for rc/prod modes
 *   6. Migration script exists at scripts/migrations/sqlite-to-pg.mjs
 *   7. OIDC enforcement in rc/prod (Phase 150)
 *   8. Portal session token hashing repo (Phase 150)
 *   9. auth-mode-policy.ts enforceAuthMode + oidc check (Phase 153)
 *  10. oidc-provider.ts validateOidcConfig + client ID check (Phase 153)
 *  11. tenant_oidc_mapping migration exists (Phase 153)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const API_SRC = resolve(ROOT, "apps/api/src");

export const id = "G12_data_plane";
export const name = "Data Plane (PG-only)";

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";

  // ── 1. runtime-mode.ts exists with required exports ──────
  const runtimeModePath = resolve(API_SRC, "platform/runtime-mode.ts");
  if (!existsSync(runtimeModePath)) {
    details.push("runtime-mode.ts: MISSING");
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  const runtimeSrc = readFileSync(runtimeModePath, "utf8");
  const requiredExports = [
    "getRuntimeMode",
    "requiresPg",
    "allowsSqlite",
    "blocksJsonStores",
    "validateRuntimeMode",
  ];
  const missingExports = requiredExports.filter(
    (e) => !runtimeSrc.includes(`export function ${e}`)
  );
  if (missingExports.length > 0) {
    details.push(`runtime-mode.ts: missing exports: ${missingExports.join(", ")}`);
    status = "fail";
  } else {
    details.push(`runtime-mode.ts: ${requiredExports.length}/${requiredExports.length} exports present`);
  }

  // ── 2. store-resolver.ts imports runtime-mode and blocks sqlite in rc/prod ──
  const resolverPath = resolve(API_SRC, "platform/store-resolver.ts");
  if (!existsSync(resolverPath)) {
    details.push("store-resolver.ts: MISSING");
    status = "fail";
  } else {
    const resolverSrc = readFileSync(resolverPath, "utf8");
    const importsRuntimeMode = resolverSrc.includes("runtime-mode");
    const blocksRcProd = resolverSrc.includes("requiresPg") || resolverSrc.includes("pgRequired");
    if (!importsRuntimeMode) {
      details.push("store-resolver.ts: does NOT import runtime-mode");
      status = "fail";
    } else if (!blocksRcProd) {
      details.push("store-resolver.ts: does NOT enforce PG for rc/prod");
      status = "fail";
    } else {
      details.push("store-resolver.ts: imports runtime-mode + enforces PG for rc/prod");
    }
  }

  // ── 3. data-plane-posture.ts exists ───────────────────────
  const posturePath = resolve(API_SRC, "posture/data-plane-posture.ts");
  if (!existsSync(posturePath)) {
    details.push("data-plane-posture.ts: MISSING");
    status = "fail";
  } else {
    const postureSrc = readFileSync(posturePath, "utf8");
    if (!postureSrc.includes("checkDataPlanePosture")) {
      details.push("data-plane-posture.ts: missing checkDataPlanePosture export");
      status = "fail";
    } else {
      details.push("data-plane-posture.ts: checkDataPlanePosture present");
    }
  }

  // ── 4. payer-persistence.ts guards JSON writes ────────────
  const payerPersistPath = resolve(API_SRC, "rcm/payers/payer-persistence.ts");
  if (!existsSync(payerPersistPath)) {
    details.push("payer-persistence.ts: MISSING (non-fatal)");
  } else {
    const payerSrc = readFileSync(payerPersistPath, "utf8");
    if (!payerSrc.includes("blocksJsonStores")) {
      details.push("payer-persistence.ts: does NOT guard with blocksJsonStores()");
      status = "fail";
    } else {
      details.push("payer-persistence.ts: JSON write guard present");
    }
  }

  // ── 5. pg-migrate.ts auto-enables RLS for rc/prod ────────
  const pgMigratePath = resolve(API_SRC, "platform/pg/pg-migrate.ts");
  if (!existsSync(pgMigratePath)) {
    details.push("pg-migrate.ts: MISSING");
    status = "fail";
  } else {
    const migrateSrc = readFileSync(pgMigratePath, "utf8");
    const hasRcCheck = migrateSrc.includes("isRcOrProd") || migrateSrc.includes("RUNTIME_MODE");
    if (!hasRcCheck) {
      details.push("pg-migrate.ts: does NOT auto-enable RLS for rc/prod");
      status = "fail";
    } else {
      details.push("pg-migrate.ts: RLS auto-enabled for rc/prod");
    }
  }

  // ── 6. Migration script exists ────────────────────────────
  const migrationScript = resolve(ROOT, "scripts/migrations/sqlite-to-pg.mjs");
  if (!existsSync(migrationScript)) {
    details.push("scripts/migrations/sqlite-to-pg.mjs: MISSING");
    status = "fail";
  } else {
    details.push("scripts/migrations/sqlite-to-pg.mjs: present");
  }

  // ── 7. OIDC enforcement in rc/prod (Phase 150) ───────────
  if (existsSync(runtimeModePath)) {
    const rtSrc = readFileSync(runtimeModePath, "utf8");
    const hasRequiresOidc = rtSrc.includes("export function requiresOidc");
    const hasOidcValidation = rtSrc.includes("OIDC_ENABLED") && rtSrc.includes("OIDC_ISSUER");
    if (!hasRequiresOidc) {
      details.push("runtime-mode.ts: missing requiresOidc() export (Phase 150)");
      status = "fail";
    } else if (!hasOidcValidation) {
      details.push("runtime-mode.ts: OIDC validation missing in validateRuntimeMode()");
      status = "fail";
    } else {
      details.push("runtime-mode.ts: OIDC enforcement in rc/prod present (Phase 150)");
    }
  }

  // ── 8. Portal session token hashing (Phase 150) ──────────
  const portalSessionRepoPath = resolve(API_SRC, "platform/pg/repo/pg-portal-session-repo.ts");
  if (!existsSync(portalSessionRepoPath)) {
    details.push("pg-portal-session-repo.ts: MISSING (Phase 150)");
    status = "fail";
  } else {
    const repoSrc = readFileSync(portalSessionRepoPath, "utf8");
    if (!repoSrc.includes("hashPortalToken") || !repoSrc.includes("sha256")) {
      details.push("pg-portal-session-repo.ts: missing token hashing");
      status = "fail";
    } else {
      details.push("pg-portal-session-repo.ts: SHA-256 token hashing present (Phase 150)");
    }
  }

  // ── 9. OIDC config depth: auth-mode-policy.ts enforces oidc in rc/prod (Phase 153) ──
  const authModePolicyPath = resolve(API_SRC, "auth/auth-mode-policy.ts");
  if (!existsSync(authModePolicyPath)) {
    details.push("auth-mode-policy.ts: MISSING (Phase 141/153)");
    status = "fail";
  } else {
    const ampSrc = readFileSync(authModePolicyPath, "utf8");
    const hasEnforce = ampSrc.includes("enforceAuthMode");
    const hasOidcCheck = ampSrc.includes('mode !== "oidc"') || ampSrc.includes("mode !== 'oidc'");
    if (!hasEnforce || !hasOidcCheck) {
      details.push("auth-mode-policy.ts: missing enforceAuthMode or oidc enforcement");
      status = "fail";
    } else {
      details.push("auth-mode-policy.ts: enforceAuthMode + oidc-in-rcprod present (Phase 141/153)");
    }
  }

  // ── 10. OIDC provider has validateOidcConfig (Phase 153) ──
  const oidcProviderPath = resolve(API_SRC, "auth/oidc-provider.ts");
  if (!existsSync(oidcProviderPath)) {
    details.push("oidc-provider.ts: MISSING");
    status = "fail";
  } else {
    const oidcSrc = readFileSync(oidcProviderPath, "utf8");
    const hasValidate = oidcSrc.includes("validateOidcConfig");
    const hasClientIdCheck = oidcSrc.includes("OIDC_CLIENT_ID");
    if (!hasValidate) {
      details.push("oidc-provider.ts: missing validateOidcConfig() (Phase 153)");
      status = "fail";
    } else if (!hasClientIdCheck) {
      details.push("oidc-provider.ts: missing OIDC_CLIENT_ID validation (Phase 153)");
      status = "fail";
    } else {
      details.push("oidc-provider.ts: validateOidcConfig + OIDC_CLIENT_ID check present (Phase 153)");
    }
  }

  // ── 11. tenant_oidc_mapping migration exists (Phase 153) ──
  if (existsSync(pgMigratePath)) {
    const migSrc = readFileSync(pgMigratePath, "utf8");
    if (!migSrc.includes("tenant_oidc_mapping")) {
      details.push("pg-migrate.ts: missing tenant_oidc_mapping table (Phase 153)");
      status = "fail";
    } else {
      details.push("pg-migrate.ts: tenant_oidc_mapping migration present (Phase 153)");
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
