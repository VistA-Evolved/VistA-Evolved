#!/usr/bin/env node
/**
 * scripts/prompts-reserve-range.mjs
 *
 * Reserves a contiguous phase range for a wave, preventing collisions.
 *
 * Usage:
 *   node scripts/prompts-reserve-range.mjs --wave 16 --count 9 --branch "main" --owner "agent"
 *
 * Behavior:
 *   1. Reads /docs/qa/prompt-phase-range-reservations.json (creates if missing)
 *   2. Computes next available start from prompts-next-phase scan
 *   3. Checks for overlaps with existing reservations
 *   4. Appends new reservation
 *   5. Writes updated file
 *   6. Outputs the reserved range
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const RESERVATIONS_FILE = join(ROOT, 'docs', 'qa', 'prompt-phase-range-reservations.json');
const PROMPTS_DIR = join(ROOT, 'prompts');

// ── Parse args ─────────────────────────────────────────────────────

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

const wave = getArg('wave');
const count = parseInt(getArg('count') || '0', 10);
const branch = getArg('branch') || 'main';
const owner = getArg('owner') || 'agent';

if (!wave || !count || count < 1) {
  console.error(
    'Usage: node prompts-reserve-range.mjs --wave <N> --count <N> --branch <name> --owner <name>'
  );
  process.exit(1);
}

// ── Compute max used phase ─────────────────────────────────────────

function computeMaxUsed() {
  let max = 0;

  // From folders
  try {
    const dirs = readdirSync(PROMPTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const d of dirs) {
      const m = d.name.match(/^(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  } catch {
    /* empty */
  }

  // From manifests
  try {
    const manifests = readdirSync(PROMPTS_DIR).filter((f) => /^WAVE_\d+_MANIFEST\.md$/i.test(f));
    for (const mf of manifests) {
      const content = readFileSync(join(PROMPTS_DIR, mf), 'utf-8');
      for (const match of content.matchAll(/\|\s*(\d+)\s*\|/g)) {
        max = Math.max(max, parseInt(match[1], 10));
      }
    }
  } catch {
    /* empty */
  }

  // From reservation file
  try {
    if (existsSync(RESERVATIONS_FILE)) {
      const raw = readFileSync(RESERVATIONS_FILE, 'utf-8');
      const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      const data = JSON.parse(clean);
      const reservations = Array.isArray(data) ? data : data.reservations || [];
      for (const r of reservations) {
        max = Math.max(max, parseInt(r.end, 10));
      }
    }
  } catch {
    /* empty */
  }

  return max;
}

// ── Load / create reservations ─────────────────────────────────────

function loadReservations() {
  if (!existsSync(RESERVATIONS_FILE)) return [];
  try {
    const raw = readFileSync(RESERVATIONS_FILE, 'utf-8');
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const data = JSON.parse(clean);
    return Array.isArray(data) ? data : data.reservations || [];
  } catch {
    return [];
  }
}

function saveReservations(reservations) {
  const dir = dirname(RESERVATIONS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(RESERVATIONS_FILE, JSON.stringify(reservations, null, 2) + '\n', 'utf-8');
}

// ── Check overlaps ─────────────────────────────────────────────────

function rangesOverlap(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

// ── Main ───────────────────────────────────────────────────────────

const reservations = loadReservations();

// Check if this wave is already reserved
const existing = reservations.find((r) => String(r.wave) === String(wave));
if (existing) {
  console.log(`Wave ${wave} already reserved: ${existing.start}-${existing.end}`);
  console.log(JSON.stringify(existing, null, 2));
  process.exit(0);
}

const maxUsed = computeMaxUsed();
const start = maxUsed + 1;
const end = start + count - 1;

// Verify no overlap
for (const r of reservations) {
  if (rangesOverlap({ start, end }, { start: parseInt(r.start, 10), end: parseInt(r.end, 10) })) {
    console.error(
      `ERROR: range ${start}-${end} overlaps with wave ${r.wave} (${r.start}-${r.end})`
    );
    process.exit(1);
  }
}

const reservation = {
  wave: String(wave),
  start,
  end,
  count,
  branch,
  owner,
  status: 'reserved',
  reservedAt: new Date().toISOString(),
};

reservations.push(reservation);
saveReservations(reservations);

console.log(`Reserved range for Wave ${wave}: ${start}-${end} (${count} phases)`);
console.log(JSON.stringify(reservation, null, 2));
process.exit(0);
