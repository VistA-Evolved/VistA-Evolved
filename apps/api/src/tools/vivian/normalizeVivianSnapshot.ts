/**
 * normalizeVivianSnapshot.ts -- Extract + normalize RPC index from Vivian grounding data.
 *
 * Input:  docs/grounding/vivian-index.json  (90K-line package+RPC index)
 * Output: data/vista/vivian/rpc_index.json  (flat sorted deduplicated list)
 *         data/vista/vivian/rpc_index.hash  (SHA-256 content hash)
 *
 * Usage:  npx tsx apps/api/src/tools/vivian/normalizeVivianSnapshot.ts
 *
 * Sanitization:
 *   - Strips any field containing IP addresses, tokens, passwords, SSNs
 *   - Only emits: { name, package, tag, routine } per RPC entry
 *   - Stable alphabetical ordering by name
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ */
/*  Paths                                                              */
/* ------------------------------------------------------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../../../..");
const VIVIAN_SRC = resolve(ROOT, "docs/grounding/vivian-index.json");
const OUT_DIR = resolve(ROOT, "data/vista/vivian");
const OUT_INDEX = resolve(OUT_DIR, "rpc_index.json");
const OUT_HASH = resolve(OUT_DIR, "rpc_index.hash");

/* ------------------------------------------------------------------ */
/*  Sensitive-data patterns (never emit these)                        */
/* ------------------------------------------------------------------ */
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,          // SSN
  /\b\d{1,3}(\.\d{1,3}){3}\b/,      // IPv4
  /password|secret|token|credential/i,
  /PROV123|PHARM123|NURSE123/i,
];

function isSensitive(s: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(s));
}

/* ------------------------------------------------------------------ */
/*  RPC entry type                                                     */
/* ------------------------------------------------------------------ */
export interface VivianRpcEntry {
  name: string;
  package: string;
  /** Additional metadata from Vivian (availability, access) */
  availability?: string;
  access?: string;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
function main(): void {
  if (!existsSync(VIVIAN_SRC)) {
    console.error(`ERROR: Vivian source not found at ${VIVIAN_SRC}`);
    process.exit(1);
  }

  console.log(`Reading Vivian index from ${VIVIAN_SRC}...`);
  const raw = readFileSync(VIVIAN_SRC, "utf-8");
  const vivian = JSON.parse(raw);

  const seen = new Set<string>();
  const entries: VivianRpcEntry[] = [];

  const packages = vivian.packages || {};
  for (const [prefix, pkg] of Object.entries<any>(packages)) {
    const rpcs: string[] = pkg.rpcs || [];
    for (const rpcName of rpcs) {
      // Normalize: trim, uppercase for comparison, preserve original case
      const normalized = rpcName.trim().replace(/\s+/g, " ");
      const key = normalized.toUpperCase();

      if (!key || seen.has(key)) continue;
      if (isSensitive(normalized)) continue;

      seen.add(key);
      entries.push({
        name: normalized,
        package: prefix,
      });
    }
  }

  // Stable alphabetical sort by name (case-insensitive)
  entries.sort((a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase()));

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      source: "docs/grounding/vivian-index.json",
      description: "Normalized deduplicated RPC index from WorldVistA Vivian/DOX",
      totalRpcs: entries.length,
      tool: "apps/api/src/tools/vivian/normalizeVivianSnapshot.ts",
    },
    rpcs: entries,
  };

  // Write index
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const json = JSON.stringify(output, null, 2);
  writeFileSync(OUT_INDEX, json, "utf-8");
  console.log(`Wrote ${entries.length} RPCs to ${OUT_INDEX}`);

  // Write content hash
  const hash = createHash("sha256").update(json).digest("hex");
  writeFileSync(OUT_HASH, hash + "\n", "utf-8");
  console.log(`Hash: ${hash}`);
  console.log(`Wrote hash to ${OUT_HASH}`);
}

main();
