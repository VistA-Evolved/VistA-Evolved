/**
 * buildRpcCoverageMatrix.ts -- Compare Vivian RPC index vs live VistA instance catalog.
 *
 * Input:
 *   - data/vista/vivian/rpc_index.json  (normalized Vivian snapshot)
 *   - GET /vista/rpc-catalog response   (live VistA instance RPCs from File 8994)
 *     OR cached data/vista/vista_instance/rpc_catalog_cache.json
 *
 * Output:
 *   - data/vista/vista_instance/rpc_present.json       (RPCs found in both)
 *   - data/vista/vista_instance/rpc_missing_vs_vivian.json (in Vivian but not instance)
 *   - data/vista/vista_instance/rpc_extra_vs_vivian.json   (in instance but not Vivian)
 *   - docs/vista/rpc-coverage-report.md                 (human-readable report)
 *
 * Usage:
 *   npx tsx apps/api/src/tools/vista/buildRpcCoverageMatrix.ts
 *   npx tsx apps/api/src/tools/vista/buildRpcCoverageMatrix.ts --api http://127.0.0.1:3001
 *   npx tsx apps/api/src/tools/vista/buildRpcCoverageMatrix.ts --cached
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../../../../..");

const VIVIAN_INDEX = resolve(ROOT, "data/vista/vivian/rpc_index.json");
const INSTANCE_DIR = resolve(ROOT, "data/vista/vista_instance");
const CACHE_FILE = resolve(INSTANCE_DIR, "rpc_catalog_cache.json");
const PRESENT_FILE = resolve(INSTANCE_DIR, "rpc_present.json");
const MISSING_FILE = resolve(INSTANCE_DIR, "rpc_missing_vs_vivian.json");
const EXTRA_FILE = resolve(INSTANCE_DIR, "rpc_extra_vs_vivian.json");
const REPORT_FILE = resolve(ROOT, "docs/vista/rpc-coverage-report.md");

interface RpcIndexEntry { name: string; package?: string; }
interface CatalogEntry { ien: string; name: string; tag?: string; routine?: string; present: boolean; }

async function fetchLiveCatalog(apiBase: string): Promise<CatalogEntry[]> {
  // Login first to get session cookie
  const loginResp = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode: process.env.VISTA_ACCESS_CODE || "PROV123", verifyCode: process.env.VISTA_VERIFY_CODE || "PROV123!!" }),
  });
  const cookies = loginResp.headers.getSetCookie?.() || [];
  const cookieStr = cookies.map((c: string) => c.split(";")[0]).join("; ");

  const resp = await fetch(`${apiBase}/vista/rpc-catalog`, {
    headers: { Cookie: cookieStr },
  });
  const data = await resp.json() as any;
  if (!data.ok) throw new Error(`RPC catalog fetch failed: ${data.error || "unknown"}`);
  return data.catalog || [];
}

function loadCachedCatalog(): CatalogEntry[] {
  if (!existsSync(CACHE_FILE)) {
    throw new Error(`No cached catalog at ${CACHE_FILE}. Run with --api first.`);
  }
  const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  return raw.catalog || raw;
}

function loadVivianIndex(): RpcIndexEntry[] {
  if (!existsSync(VIVIAN_INDEX)) {
    throw new Error(`Vivian index not found at ${VIVIAN_INDEX}. Run normalizeVivianSnapshot.ts first.`);
  }
  const raw = JSON.parse(readFileSync(VIVIAN_INDEX, "utf-8"));
  return raw.rpcs || [];
}

function generateReport(
  vivianRpcs: RpcIndexEntry[],
  instanceRpcs: CatalogEntry[],
  overlap: string[],
  missingFromInstance: string[],
  extraInInstance: string[],
): string {
  const now = new Date().toISOString();
  const overlapPct = vivianRpcs.length > 0
    ? ((overlap.length / vivianRpcs.length) * 100).toFixed(1)
    : "0";

  let md = `# VistA RPC Coverage Report\n\n`;
  md += `> Generated: ${now}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total in Vivian index | ${vivianRpcs.length} |\n`;
  md += `| Total in VistA instance | ${instanceRpcs.length} |\n`;
  md += `| Overlap (in both) | ${overlap.length} |\n`;
  md += `| Missing from instance (Vivian only) | ${missingFromInstance.length} |\n`;
  md += `| Extra in instance (not in Vivian) | ${extraInInstance.length} |\n`;
  md += `| Coverage (overlap / Vivian) | ${overlapPct}% |\n\n`;

  md += `## What This Means\n\n`;
  md += `- **Overlap**: RPCs available in both the Vivian reference index and this VistA instance.\n`;
  md += `- **Missing from instance**: RPCs in the Vivian index that are NOT registered in this VistA build.\n`;
  md += `  These are likely distro differences (e.g., modules not installed in WorldVistA Docker).\n`;
  md += `- **Extra in instance**: RPCs registered in VistA but not in the Vivian snapshot.\n`;
  md += `  These may be custom RPCs (VE *), newer additions, or Vivian snapshot gaps.\n\n`;

  if (extraInInstance.length > 0 && extraInInstance.length <= 50) {
    md += `## Extra in Instance (${extraInInstance.length})\n\n`;
    md += `| # | RPC Name |\n|---|----------|\n`;
    extraInInstance.forEach((name, i) => {
      md += `| ${i + 1} | ${name} |\n`;
    });
    md += `\n`;
  }

  md += `## VistA-Evolved App RPC Usage\n\n`;
  md += `The app uses ~75 unique RPCs at runtime (see rpcRegistry.ts).\n`;
  md += `All runtime RPCs should be in the overlap set or in RPC_EXCEPTIONS.\n\n`;

  md += `---\n\n`;
  md += `*Report generated by buildRpcCoverageMatrix.ts*\n`;

  return md;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const useCached = args.includes("--cached");
  const apiIndex = args.indexOf("--api");
  const apiBase = apiIndex >= 0 ? args[apiIndex + 1] : "http://127.0.0.1:3001";

  console.log("Loading Vivian index...");
  const vivianRpcs = loadVivianIndex();
  const vivianSet = new Set(vivianRpcs.map((r) => r.name.toUpperCase()));
  console.log(`  ${vivianRpcs.length} RPCs in Vivian index`);

  let instanceRpcs: CatalogEntry[];
  if (useCached) {
    console.log("Loading cached instance catalog...");
    instanceRpcs = loadCachedCatalog();
  } else {
    console.log(`Fetching live catalog from ${apiBase}...`);
    try {
      instanceRpcs = await fetchLiveCatalog(apiBase);
      // Cache it
      if (!existsSync(INSTANCE_DIR)) mkdirSync(INSTANCE_DIR, { recursive: true });
      writeFileSync(CACHE_FILE, JSON.stringify({ fetchedAt: new Date().toISOString(), catalog: instanceRpcs }, null, 2));
      console.log(`  Cached to ${CACHE_FILE}`);
    } catch (err: any) {
      console.warn(`  Live fetch failed: ${err.message}`);
      if (existsSync(CACHE_FILE)) {
        console.log("  Falling back to cached catalog...");
        instanceRpcs = loadCachedCatalog();
      } else {
        console.error("  No cached catalog available. Run the API first or provide --api URL.");
        process.exit(1);
      }
    }
  }

  const instanceSet = new Set(instanceRpcs.map((r) => r.name.toUpperCase()));
  console.log(`  ${instanceRpcs.length} RPCs in VistA instance`);

  // Compute sets
  const overlap = [...vivianSet].filter((n) => instanceSet.has(n)).sort();
  const missingFromInstance = [...vivianSet].filter((n) => !instanceSet.has(n)).sort();
  const extraInInstance = [...instanceSet].filter((n) => !vivianSet.has(n)).sort();

  console.log(`\nResults:`);
  console.log(`  Overlap:                ${overlap.length}`);
  console.log(`  Missing from instance:  ${missingFromInstance.length}`);
  console.log(`  Extra in instance:      ${extraInInstance.length}`);

  // Write output files
  if (!existsSync(INSTANCE_DIR)) mkdirSync(INSTANCE_DIR, { recursive: true });

  writeFileSync(PRESENT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: overlap.length, rpcs: overlap }, null, 2));
  writeFileSync(MISSING_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: missingFromInstance.length, rpcs: missingFromInstance }, null, 2));
  writeFileSync(EXTRA_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: extraInInstance.length, rpcs: extraInInstance }, null, 2));

  // Generate report
  const docsDir = resolve(ROOT, "docs/vista");
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
  const report = generateReport(vivianRpcs, instanceRpcs, overlap, missingFromInstance, extraInInstance);
  writeFileSync(REPORT_FILE, report, "utf-8");

  console.log(`\nWrote:`);
  console.log(`  ${PRESENT_FILE}`);
  console.log(`  ${MISSING_FILE}`);
  console.log(`  ${EXTRA_FILE}`);
  console.log(`  ${REPORT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
