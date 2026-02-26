#!/usr/bin/env node
/**
 * G21 -- No New Critical Map Store Gate (Phase 145)
 *
 * Hard gate: fails if new high-risk in-memory Map stores appear
 * in critical modules (rcm, portal, telehealth, scheduling,
 * imaging, auth/iam).
 *
 * Compares against a committed baseline count. New stores are
 * allowed in non-critical modules (analytics, dev tools, etc.)
 * but any increase in critical modules must be registered in
 * store-policy.ts with a migrationTarget.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const API_SRC = resolve(ROOT, "apps/api/src");
const BASELINE_PATH = resolve(__dirname, "../critical-map-baseline.json");

export const id = "G21_no_new_critical_map_store";
export const name = "No New Critical Map Store";

const CRITICAL_PATH_PATTERNS = [
  /\brcm\b/i,
  /\bportal/i,
  /\btelehealth\b/i,
  /\bscheduling\b/i,
  /\bimaging\b/i,
  /\bauth\b/i,
  /\biam\b/i,
  /\bsession/i,
];

function walkFiles(dir, exts, maxDepth = 10) {
  const results = [];
  if (!existsSync(dir) || maxDepth <= 0) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...walkFiles(full, exts, maxDepth - 1));
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function rel(p) { return relative(ROOT, p).replace(/\\/g, "/"); }

function scanCriticalMapStores() {
  const mapPattern = /(?:const|let)\s+(\w+)\s*[:=]\s*new\s+Map\s*[<(]/;
  const allTs = walkFiles(API_SRC, [".ts"]);
  const stores = [];

  for (const file of allTs) {
    const relPath = rel(file);
    const isCritical = CRITICAL_PATH_PATTERNS.some(p => p.test(relPath));
    if (!isCritical) continue;

    try {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(mapPattern);
        if (match) {
          stores.push({
            file: relPath,
            variable: match[1],
            line: i + 1,
          });
        }
      }
    } catch { /* skip */ }
  }

  return stores;
}

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = "pass";

  const currentStores = scanCriticalMapStores();
  const currentCount = currentStores.length;

  details.push(`Current critical-module Map stores: ${currentCount}`);

  // Load baseline
  let baseline;
  if (existsSync(BASELINE_PATH)) {
    try {
      const raw = readFileSync(BASELINE_PATH, "utf8");
      baseline = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    } catch {
      baseline = null;
    }
  }

  if (!baseline) {
    details.push("FAIL: critical-map-baseline.json missing. Run: node qa/gauntlet/gates/g21-no-new-critical-map-store.mjs --update-baseline");
    return { id, name, status: "fail", details, durationMs: Date.now() - start };
  }

  const delta = currentCount - baseline.count;
  details.push(`Baseline critical-module Map stores: ${baseline.count}`);

  if (delta > 0) {
    // Find which stores are new
    // Use file:variable as identity key (line numbers shift on refactor)
    const baselineSet = new Set((baseline.stores || []).map(s => {
      const parts = s.split(":");
      return parts.length >= 3 ? `${parts[0]}:${parts.slice(2).join(":")}` : s;
    }));
    const newStores = currentStores.filter(
      s => !baselineSet.has(`${s.file}:${s.variable}`)
    );

    details.push(`FAIL: ${delta} new critical-module Map store(s) detected`);
    for (const s of newStores.slice(0, 10)) {
      details.push(`  NEW: ${s.variable} in ${s.file}:${s.line}`);
    }
    details.push("Register in store-policy.ts with migrationTarget, then update baseline: node qa/gauntlet/gates/g21-no-new-critical-map-store.mjs --update-baseline");
    status = "fail";
  } else if (delta < 0) {
    details.push(`PASS: ${Math.abs(delta)} critical Map store(s) removed (good)`);
  } else {
    details.push("PASS: No new critical Map stores");
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}

// CLI: --update-baseline
if (process.argv.includes("--update-baseline")) {
  const stores = scanCriticalMapStores();
  const baselineData = {
    generatedAt: new Date().toISOString(),
    note: "Baseline for critical Map store detection. Update with: node qa/gauntlet/gates/g21-no-new-critical-map-store.mjs --update-baseline",
    count: stores.length,
    stores: stores.map(s => `${s.file}:${s.line}:${s.variable}`),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baselineData, null, 2) + "\n");
  console.log(`Baseline updated: ${stores.length} critical Map stores`);
}
