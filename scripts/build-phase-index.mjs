#!/usr/bin/env node
/**
 * scripts/build-phase-index.mjs -- Phase 108: Phase Audit Harness
 *
 * Scans prompts/ directory and extracts structured metadata per phase.
 * Generates docs/qa/phase-index.json as the canonical phase catalog.
 *
 * Usage:
 *   node scripts/build-phase-index.mjs [--out path]
 *
 * Extraction heuristics:
 *   - Phase number + title from H1 heading or folder name
 *   - Routes from regex scan (GET/POST/PUT/DELETE/PATCH /path)
 *   - RPCs from known patterns (ALL CAPS with spaces, RPC names)
 *   - UI components from .tsx file paths
 *   - Files touched from ## Files Touched sections
 */

import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, "prompts");
const DEFAULT_OUT = join(ROOT, "docs", "qa", "phase-index.json");

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : DEFAULT_OUT;

// ---- Patterns ----

const PHASE_FOLDER_RE = /^(\d{2,3})-PHASE-(\d+[A-Z]?)-(.+)$/;
const WAVE_FOLDER_RE = /^(\d+)-W(\d+)-P(\d+)-(.+)$/;
const WAVE_AUDIT_RE = /^(\d+)-WAVE-(\d+)-(.+)$/;
const H1_PHASE_RE = /^#\s+Phase\s+(\d+\w*)\s*[-\u2014]+\s*(.+?)(?:\s*\((?:IMPLEMENT|VERIFY)\))?$/m;
const ROUTE_RE = /(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s"'`,)}\]]+)/g;
const URL_PATH_RE = /`(\/[a-z][a-z0-9\-_/{}:*]+)`/g;
const RPC_RE = /(?:['"`])([A-Z][A-Z0-9 ]+[A-Z0-9])(?:['"`])/g;
const TSX_FILE_RE = /([A-Za-z][A-Za-z0-9_-]+\.tsx)/g;
const FILES_TOUCHED_RE = /##\s+Files?\s+[Tt]ouched\b/;

// Known RPC name patterns (must be >= 3 words or start with known prefixes)
const RPC_PREFIXES = [
  "OR", "XWB", "XUS", "ORWPT", "ORWDX", "TIU", "GMRA", "ORWPS",
  "ORWRP", "ORQQPL", "ORQQPX", "ORWDAL", "GMV", "ORPRF",
];

function isLikelyRpc(name) {
  if (name.length < 6 || name.length > 60) return false;
  const words = name.split(/\s+/);
  if (words.length < 2) return false;
  // Must start with a known RPC prefix or have 3+ words
  return RPC_PREFIXES.some((p) => name.startsWith(p)) || words.length >= 3;
}

function extractRoutes(text) {
  const routes = new Set();
  let m;
  const routeRe = new RegExp(ROUTE_RE.source, "g");
  while ((m = routeRe.exec(text))) routes.add(m[1].replace(/[.,;:]+$/, ""));
  const urlRe = new RegExp(URL_PATH_RE.source, "g");
  while ((m = urlRe.exec(text))) {
    const p = m[1].replace(/[.,;:]+$/, "");
    if (p.includes("/") && !p.endsWith(".ts") && !p.endsWith(".tsx") && !p.endsWith(".md")) {
      routes.add(p);
    }
  }
  return [...routes].sort();
}

function extractRpcs(text) {
  const rpcs = new Set();
  let m;
  const re = new RegExp(RPC_RE.source, "g");
  while ((m = re.exec(text))) {
    const name = m[1].trim();
    if (isLikelyRpc(name)) rpcs.add(name);
  }
  return [...rpcs].sort();
}

function extractUiComponents(text) {
  const components = new Set();
  let m;
  const re = new RegExp(TSX_FILE_RE.source, "g");
  while ((m = re.exec(text))) components.add(m[1]);
  return [...components].sort();
}

function extractFilesTouched(text) {
  const match = text.match(FILES_TOUCHED_RE);
  if (!match) return [];
  const afterHeading = text.slice(match.index + match[0].length);
  const lines = afterHeading.split("\n");
  const files = [];
  for (const line of lines) {
    // Stop at next heading
    if (/^##\s/.test(line)) break;
    // Extract file paths from bullets
    const fileMatch = line.match(/[-*]\s+`?([^\s`]+\.[a-z]{1,5})`?/);
    if (fileMatch) files.push(fileMatch[1]);
  }
  return files;
}

// ---- Main ----

if (!existsSync(PROMPTS_DIR)) {
  console.error("prompts/ directory not found");
  process.exit(1);
}

const entries = readdirSync(PROMPTS_DIR)
  .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
  .filter((e) => /^\d+-(?:PHASE-\d|W\d+-P\d+-|WAVE-\d+-)/.test(e))
  .sort();

console.log(`\n=== Phase Index Builder (Phase 108) ===`);
console.log(`  Scanning ${entries.length} phase folders...\n`);

const phases = [];

for (const folder of entries) {
  const folderPath = join(PROMPTS_DIR, folder);
  const folderMatch = folder.match(PHASE_FOLDER_RE);
  const waveMatch = !folderMatch ? folder.match(WAVE_FOLDER_RE) : null;
  const auditMatch = !folderMatch && !waveMatch ? folder.match(WAVE_AUDIT_RE) : null;

  // Extract phase number from folder name
  let phaseId, folderTitle;
  if (folderMatch) {
    phaseId = folderMatch[2];
    folderTitle = folderMatch[3].replace(/-/g, " ");
  } else if (waveMatch) {
    phaseId = waveMatch[1];
    folderTitle = `W${waveMatch[2]}-P${waveMatch[3]} ${waveMatch[4].replace(/-/g, " ")}`;
  } else if (auditMatch) {
    phaseId = auditMatch[1];
    folderTitle = `Wave ${auditMatch[2]} ${auditMatch[3].replace(/-/g, " ")}`;
  } else {
    phaseId = folder.match(/^(\d+)/)?.[1] || "?";
    folderTitle = folder;
  }

  // Read all .md files in folder
  const mdFiles = readdirSync(folderPath).filter((f) => f.endsWith(".md")).sort();
  const allText = mdFiles
    .map((f) => {
      try { return readFileSync(join(folderPath, f), "utf-8"); }
      catch { return ""; }
    })
    .join("\n\n---\n\n");

  // Extract title from H1 if available
  const h1Match = allText.match(H1_PHASE_RE);
  const title = h1Match ? h1Match[2].trim() : folderTitle;

  // Classify files
  const implementFiles = mdFiles.filter((f) => /IMPLEMENT/i.test(f));
  const verifyFiles = mdFiles.filter((f) => /VERIFY/i.test(f));

  // Extract structured data
  const routes = extractRoutes(allText);
  const rpcs = extractRpcs(allText);
  const uiComponents = extractUiComponents(allText);
  const filesTouched = extractFilesTouched(allText);

  const phase = {
    phaseNumber: phaseId,
    title,
    folder,
    files: mdFiles,
    implementFiles,
    verifyFiles,
    routes: routes.slice(0, 30),        // cap for sanity
    rpcs: rpcs.slice(0, 20),
    uiComponents: uiComponents.slice(0, 20),
    filesTouched: filesTouched.slice(0, 40),
  };

  phases.push(phase);
  const routeStr = routes.length > 0 ? ` (${routes.length} routes)` : "";
  const rpcStr = rpcs.length > 0 ? ` (${rpcs.length} RPCs)` : "";
  console.log(`  Phase ${phaseId.padEnd(5)} ${title.slice(0, 50).padEnd(52)}${routeStr}${rpcStr}`);
}

// Write output
const output = {
  generatedAt: new Date().toISOString(),
  generator: "scripts/build-phase-index.mjs",
  phaseCount: phases.length,
  phases,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
console.log(`\n  Written: ${outPath}`);
console.log(`  Phases: ${phases.length}`);
console.log(`  Phases with routes: ${phases.filter((p) => p.routes.length > 0).length}`);
console.log(`  Phases with RPCs: ${phases.filter((p) => p.rpcs.length > 0).length}`);
console.log(`  Phases with UI: ${phases.filter((p) => p.uiComponents.length > 0).length}\n`);
