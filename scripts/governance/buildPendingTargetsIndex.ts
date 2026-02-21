#!/usr/bin/env node
/**
 * Phase 73 -- PendingTargets Index Builder
 *
 * Scans apps/web and apps/api for every pendingTargets occurrence.
 * Captures:
 *   - file path + line number
 *   - screenId or route (inferred from file path / route registration)
 *   - pendingTargets list (RPC names / prerequisites)
 *   - current UI text shown to users (if integration-pending string nearby)
 *
 * Output: /artifacts/governance/pending-targets-index.json
 *
 * Usage: npx tsx scripts/governance/buildPendingTargetsIndex.ts
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join, relative, extname } from "path";

const ROOT = process.cwd();

interface PendingEntry {
  file: string;
  line: number;
  screenOrRoute: string;
  rpcs: string[];
  uiText: string | null;
  kind: "api-response" | "ui-display" | "type-def" | "other";
}

const entries: PendingEntry[] = [];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!statSync(dir).isDirectory()) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath, exts));
    } else if (exts.includes(extname(entry))) {
      results.push(fullPath);
    }
  }
  return results;
}

function inferScreenOrRoute(filePath: string): string {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");

  // API route files
  const routeMatch = rel.match(/apps\/api\/src\/routes\/(.+)\.(ts|js)/);
  if (routeMatch) return `api:${routeMatch[1]}`;

  // Web panel files
  const panelMatch = rel.match(/panels\/(\w+)Panel\.(tsx|ts)/);
  if (panelMatch) return `panel:${panelMatch[1]}`;

  // Web page files
  const pageMatch = rel.match(/app\/(.+?)\/page\.(tsx|ts)/);
  if (pageMatch) return `page:${pageMatch[1]}`;

  // Web components
  const compMatch = rel.match(/components\/(.+)\.(tsx|ts)/);
  if (compMatch) return `component:${compMatch[1]}`;

  // Actions/registries
  const actionMatch = rel.match(/actions\/(.+)\.(ts|tsx)/);
  if (actionMatch) return `registry:${actionMatch[1]}`;

  return rel;
}

/**
 * Extract RPC names from a pendingTargets array literal on or near the given line.
 * Looks for patterns like: pendingTargets: ["RPC NAME", "RPC NAME"]
 */
function extractRpcs(lines: string[], lineIdx: number): string[] {
  const rpcs: string[] = [];
  // Check current line and a few lines after for array content
  const window = lines.slice(lineIdx, Math.min(lineIdx + 5, lines.length)).join(" ");
  const rpcMatches = window.matchAll(/"([A-Z][A-Z0-9 ]+[A-Z0-9])"/g);
  for (const m of rpcMatches) {
    if (m[1].length > 3) rpcs.push(m[1]);
  }
  return [...new Set(rpcs)];
}

/**
 * Extract UI text from nearby integration-pending strings.
 */
function extractUiText(lines: string[], lineIdx: number): string | null {
  const window = lines.slice(
    Math.max(0, lineIdx - 3),
    Math.min(lineIdx + 5, lines.length),
  );
  for (const line of window) {
    // Title attributes
    const titleMatch = line.match(/title="([^"]*(?:pending|integration)[^"]*)"/i);
    if (titleMatch) return titleMatch[1];

    // String literals with pending
    const strMatch = line.match(
      /[`"']([^`"']*(?:integration.pending|pending.target)[^`"']*)[`"']/i,
    );
    if (strMatch) return strMatch[1];
  }
  return null;
}

function classifyEntry(filePath: string, line: string): PendingEntry["kind"] {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  if (rel.includes("routes/") || rel.includes("api/")) {
    if (line.includes("pendingTargets:") && (line.includes("[") || line.includes("]"))) {
      return "api-response";
    }
  }
  if (line.match(/:\s*(string\[\]|PendingTarget)/)) return "type-def";
  if (rel.includes("Panel") || rel.includes("page.tsx") || rel.includes("Modal")) {
    return "ui-display";
  }
  return "other";
}

/* ------------------------------------------------------------------ */
/* Scan files                                                          */
/* ------------------------------------------------------------------ */

const scanDirs = [
  join(ROOT, "apps", "web", "src"),
  join(ROOT, "apps", "api", "src"),
];

for (const dir of scanDirs) {
  const files = walkDir(dir, [".ts", ".tsx"]);

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("pendingTargets") || lines[i].includes("pendingTarget")) {
        // Skip pure import/comment lines
        if (lines[i].trim().startsWith("//") && !lines[i].includes("pendingTargets:")) continue;
        if (lines[i].trim().startsWith("import ")) continue;

        const rel = relative(ROOT, filePath).replace(/\\/g, "/");
        const rpcs = extractRpcs(lines, i);
        const uiText = extractUiText(lines, i);
        const kind = classifyEntry(filePath, lines[i]);

        entries.push({
          file: rel,
          line: i + 1,
          screenOrRoute: inferScreenOrRoute(filePath),
          rpcs,
          uiText,
          kind,
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Summary stats                                                       */
/* ------------------------------------------------------------------ */

const apiResponses = entries.filter((e) => e.kind === "api-response");
const uiDisplays = entries.filter((e) => e.kind === "ui-display");
const typeDefs = entries.filter((e) => e.kind === "type-def");

const allRpcs = new Set<string>();
for (const entry of entries) {
  for (const rpc of entry.rpcs) allRpcs.add(rpc);
}

const nonEmptyRpcEntries = entries.filter((e) => e.rpcs.length > 0);
const pendingRpcEntries = apiResponses.filter(
  (e) => e.rpcs.length > 0 && !entries.some((o) => o.file === e.file && o.line === e.line && e.rpcs.length === 0),
);

const summary = {
  totalOccurrences: entries.length,
  apiResponses: apiResponses.length,
  uiDisplays: uiDisplays.length,
  typeDefs: typeDefs.length,
  other: entries.filter((e) => e.kind === "other").length,
  uniqueRpcs: allRpcs.size,
  rpcsReferenced: [...allRpcs].sort(),
  entriesWithRpcs: nonEmptyRpcEntries.length,
};

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

console.log("\n=== PendingTargets Index (Phase 73) ===\n");
console.log(`  Total occurrences: ${summary.totalOccurrences}`);
console.log(`  API responses:     ${summary.apiResponses}`);
console.log(`  UI displays:       ${summary.uiDisplays}`);
console.log(`  Type definitions:  ${summary.typeDefs}`);
console.log(`  Unique RPCs ref'd: ${summary.uniqueRpcs}`);
console.log(`\n  RPCs referenced:`);
for (const rpc of summary.rpcsReferenced) {
  console.log(`    - ${rpc}`);
}

const artifactDir = join(ROOT, "artifacts", "governance");
mkdirSync(artifactDir, { recursive: true });
writeFileSync(
  join(artifactDir, "pending-targets-index.json"),
  JSON.stringify(
    {
      _meta: {
        gate: "pending-targets-index",
        phase: 73,
        timestamp: new Date().toISOString(),
      },
      summary,
      entries,
    },
    null,
    2,
  ),
);

console.log(`\n  Output: artifacts/governance/pending-targets-index.json`);
