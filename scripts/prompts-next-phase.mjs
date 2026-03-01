#!/usr/bin/env node
/**
 * scripts/prompts-next-phase.mjs
 *
 * Scans /prompts for the highest numeric prefix across:
 *   1. Existing prompt folders
 *   2. Wave manifest reserved ranges
 *   3. Range reservation file
 *
 * Outputs the max used prefix and the next available BASE_PHASE.
 *
 * Usage:
 *   node scripts/prompts-next-phase.mjs
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, "prompts");
const RESERVATIONS_FILE = join(ROOT, "docs", "qa", "prompt-phase-range-reservations.json");

const PREFIX_RE = /^(\d+)/;

// ── 1. Scan prompt folders ─────────────────────────────────────────

let maxFromFolders = 0;
try {
  const dirs = readdirSync(PROMPTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());
  for (const d of dirs) {
    const m = d.name.match(PREFIX_RE);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxFromFolders) maxFromFolders = n;
    }
  }
} catch {
  // prompts dir not found
}

// ── 2. Scan wave manifests for reserved ranges ─────────────────────

let maxFromManifests = 0;
try {
  const manifests = readdirSync(PROMPTS_DIR)
    .filter((f) => /^WAVE_\d+_MANIFEST\.md$/i.test(f));
  for (const mf of manifests) {
    const content = readFileSync(join(PROMPTS_DIR, mf), "utf-8");
    // Match phase IDs in manifest tables: | W15-P10 | 336 | ...
    const idMatches = content.matchAll(/\|\s*(\d+)\s*\|/g);
    for (const match of idMatches) {
      const n = parseInt(match[1], 10);
      if (n > maxFromManifests) maxFromManifests = n;
    }
  }
} catch {
  // no manifests
}

// ── 3. Scan reservation file ───────────────────────────────────────

let maxFromReservations = 0;
try {
  if (existsSync(RESERVATIONS_FILE)) {
    const data = JSON.parse(readFileSync(RESERVATIONS_FILE, "utf-8"));
    const reservations = Array.isArray(data) ? data : data.reservations || [];
    for (const r of reservations) {
      const end = parseInt(r.end, 10);
      if (end > maxFromReservations) maxFromReservations = end;
    }
  }
} catch {
  // no reservation file
}

// ── Output ─────────────────────────────────────────────────────────

const maxUsed = Math.max(maxFromFolders, maxFromManifests, maxFromReservations);
const nextBase = maxUsed + 1;

const result = {
  maxFromFolders,
  maxFromManifests,
  maxFromReservations,
  maxUsed,
  nextBasephase: nextBase,
  scannedAt: new Date().toISOString(),
};

console.log(JSON.stringify(result, null, 2));
process.exit(0);
