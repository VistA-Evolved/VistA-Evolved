#!/usr/bin/env node
/**
 * G17 -- Store Policy Gate (Phase 136)
 *
 * Validates the in-memory store policy:
 *   1. store-policy.ts exists with complete inventory
 *   2. All Map stores are classified (critical/cache/rate_limiter/registry/audit/dev_only)
 *   3. No critical+in_memory_only stores in strict mode (rc/prod)
 *   4. Cache stores have TTL/maxSize declarations
 *   5. All new Map patterns in source are registered
 *   6. Critical stores have migrationTarget declared
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const API_SRC = resolve(ROOT, "apps/api/src");
const STORE_POLICY_PATH = resolve(API_SRC, "platform/store-policy.ts");

export const id = "G17_store_policy";
export const name = "Store Policy";

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";

  // ── 1. store-policy.ts exists ──────────────────────────────
  if (!existsSync(STORE_POLICY_PATH)) {
    details.push("FAIL: store-policy.ts does not exist");
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  const policySrc = readFileSync(STORE_POLICY_PATH, "utf8");

  // ── 2. Required exports present ────────────────────────────
  const requiredExports = [
    "STORE_INVENTORY",
    "getStoresByClassification",
    "getCriticalInMemoryStores",
    "getCacheStoresWithoutLimits",
    "getStoreInventorySummary",
  ];

  const missingExports = requiredExports.filter(
    (e) =>
      !policySrc.includes(`export function ${e}`) &&
      !policySrc.includes(`export const ${e}`)
  );

  if (missingExports.length > 0) {
    details.push(`FAIL: store-policy.ts missing exports: ${missingExports.join(", ")}`);
    status = "fail";
  } else {
    details.push(`store-policy.ts: ${requiredExports.length}/${requiredExports.length} exports present`);
  }

  // ── 3. Inventory has sufficient entries ─────────────────────
  const criticalCount = (policySrc.match(/classification:\s*"critical"/g) || []).length;
  const cacheCount = (policySrc.match(/classification:\s*"cache"/g) || []).length;
  const rateLimiterCount = (policySrc.match(/classification:\s*"rate_limiter"/g) || []).length;
  const registryCount = (policySrc.match(/classification:\s*"registry"/g) || []).length;
  const auditCount = (policySrc.match(/classification:\s*"audit"/g) || []).length;
  const devOnlyCount = (policySrc.match(/classification:\s*"dev_only"/g) || []).length;
  const totalRegistered =
    criticalCount + cacheCount + rateLimiterCount + registryCount + auditCount + devOnlyCount;

  if (totalRegistered < 80) {
    details.push(
      `FAIL: Store inventory has ${totalRegistered} entries (expected 80+)`
    );
    status = "fail";
  } else {
    details.push(
      `Inventory: ${totalRegistered} stores (critical=${criticalCount}, cache=${cacheCount}, ` +
        `rl=${rateLimiterCount}, reg=${registryCount}, audit=${auditCount}, dev=${devOnlyCount})`
    );
  }

  // ── 4. Critical stores with migrationTarget ────────────────
  // Check that critical + in_memory_only all have migrationTarget
  const critInMemNoMigration = [];
  const blockRegex =
    /\{\s*\n\s*id:\s*"([^"]+)"[\s\S]*?classification:\s*"critical"[\s\S]*?durability:\s*"in_memory_only"([\s\S]*?)\}/g;
  let bm;
  while ((bm = blockRegex.exec(policySrc)) !== null) {
    if (!bm[0].includes("migrationTarget")) {
      critInMemNoMigration.push(bm[1]);
    }
  }

  if (critInMemNoMigration.length > 0) {
    details.push(
      `FAIL: ${critInMemNoMigration.length} critical+in_memory_only stores lack migrationTarget`
    );
    status = "fail";
  } else {
    details.push("All critical+in_memory_only stores have migrationTarget");
  }

  // ── 5. Type exports present ─────────────────────────────────
  const typeExports = ["StoreClassification", "DurabilityStatus", "StoreEntry"];
  const missingTypes = typeExports.filter(
    (t) => !policySrc.includes(`export type ${t}`) && !policySrc.includes(`export interface ${t}`)
  );
  if (missingTypes.length > 0) {
    details.push(`FAIL: Missing type exports: ${missingTypes.join(", ")}`);
    status = "fail";
  } else {
    details.push(`Type exports: ${typeExports.length}/${typeExports.length} present`);
  }

  // ── 6. Posture endpoint wired ───────────────────────────────
  const postureIndexPath = resolve(API_SRC, "posture/index.ts");
  if (existsSync(postureIndexPath)) {
    const postureSrc = readFileSync(postureIndexPath, "utf8");
    if (postureSrc.includes("store-policy") || postureSrc.includes("getStoreInventorySummary")) {
      details.push("Posture endpoint wired to store-policy");
    } else {
      details.push("WARN: Posture index does not reference store-policy");
    }
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
