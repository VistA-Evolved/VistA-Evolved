#!/usr/bin/env node
/**
 * qa/gauntlet/build-manifest.mjs -- Phase 119: Phase Manifest Generator
 *
 * Scans prompts/ and docs/qa/phase-index.json to produce
 * qa/gauntlet/phase-manifest.json.
 *
 * For each phase it emits:
 *   phaseId, title, tags[], suites (fast/rc/full gate lists),
 *   smoke (uiRoutes, apiEndpoints, vistaProbes), notes
 *
 * Override file: qa/gauntlet/phase-manifest.overrides.json
 *   -- merged over auto-generated entries at build time.
 *
 * Usage:
 *   node qa/gauntlet/build-manifest.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const PROMPTS_DIR = join(ROOT, 'prompts');
const INDEX_PATH = join(ROOT, 'docs', 'qa', 'phase-index.json');
const OVERRIDES_PATH = join(__dirname, 'phase-manifest.overrides.json');
const OUTPUT_PATH = join(__dirname, 'phase-manifest.json');

// -- Tag inference from folder name keywords -----------------

const TAG_KEYWORDS = {
  rcm: ['RCM', 'BILLING', 'PAYER', 'CLAIM', 'EDI'],
  portal: ['PORTAL'],
  cprs: ['CPRS', 'CHART', 'COVER'],
  security: ['SECURITY', 'IAM', 'HARDENING', 'AUDIT', 'AUTH'],
  vista: ['VISTA', 'RPC', 'ALIGNMENT'],
  imaging: ['IMAGING', 'DICOM', 'PACS'],
  telehealth: ['TELEHEALTH'],
  analytics: ['ANALYTICS', 'BI'],
  interop: ['INTEROP', 'HL7'],
  observability: ['OBSERVABILITY', 'TELEMETRY', 'OTEL'],
  modularity: ['MODULAR', 'MODULE', 'SKU'],
  durability: ['DURABILITY', 'RESTART', 'PERSIST'],
  qa: ['QA', 'GAUNTLET', 'VERIFY', 'HARNESS'],
  infrastructure: ['BOOTSTRAP', 'HELLO', 'SANDBOX', 'DOCKER'],
};

function inferTags(folderName) {
  const upper = folderName.toUpperCase();
  const tags = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags.length > 0 ? tags : ['general'];
}

// -- Default gate assignments by tag -------------------------

const FAST_GATES = [
  'G0_prompts_integrity',
  'G1_build_typecheck',
  'G2_unit_tests',
  'G3_security_scans',
  'G4_contract_alignment',
];
const RC_GATES = [
  ...FAST_GATES,
  'G5_api_smoke',
  'G7_restart_durability',
  'G8_ui_dead_click',
  'G10_system_audit',
];
const FULL_GATES = [...RC_GATES, 'G6_vista_probe', 'G9_performance_budget'];

function buildSuites(tags) {
  const fast = [...FAST_GATES];
  const rc = [...RC_GATES];
  const full = [...FULL_GATES];

  // Tag-specific additions
  if (tags.includes('vista') && !rc.includes('G6_vista_probe')) {
    rc.push('G6_vista_probe');
  }
  if (tags.includes('rcm') && !fast.includes('G7_restart_durability')) {
    fast.push('G7_restart_durability');
  }
  if (tags.includes('cprs')) {
    if (!fast.includes('G4_contract_alignment')) fast.push('G4_contract_alignment');
    if (!rc.includes('G8_ui_dead_click')) rc.push('G8_ui_dead_click');
  }

  return { fast, rc, full };
}

// -- Load phase-index if available ---------------------------

let phaseIndex = new Map();
if (existsSync(INDEX_PATH)) {
  const raw = readFileSync(INDEX_PATH, 'utf-8');
  const data = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
  for (const p of data.phases || []) {
    phaseIndex.set(String(p.phaseNumber), p);
  }
}

// -- Scan prompts/ folders -----------------------------------

const PHASE_FOLDER_RE = /^(\d+)-PHASE-(\d+\w?)-(.+)/;
const allFolders = readdirSync(PROMPTS_DIR)
  .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
  .filter((e) => PHASE_FOLDER_RE.test(e));

const manifest = [];

for (const folder of allFolders) {
  const m = folder.match(PHASE_FOLDER_RE);
  if (!m) continue;

  const phaseId = m[2]; // e.g. "37B", "112"
  const titleSlug = m[3]; // e.g. "QA-GAUNTLET"
  const title = titleSlug.replace(/-/g, ' ');
  const tags = inferTags(folder);
  const suites = buildSuites(tags);

  // Pull smoke hints from phase-index if available
  const idx = phaseIndex.get(phaseId);
  const smoke = {
    uiRoutes: [],
    apiEndpoints: [],
    vistaProbes: [],
  };

  if (idx) {
    if (idx.routes) smoke.apiEndpoints = idx.routes;
    if (idx.rpcs && idx.rpcs.length > 0) {
      smoke.vistaProbes = idx.rpcs.slice(0, 5); // limit to 5
    }
    if (idx.uiComponents && idx.uiComponents.length > 0) {
      // Map components to likely routes
      smoke.uiRoutes = idx.uiComponents.filter((c) => c.includes('/')).slice(0, 5);
    }
  }

  manifest.push({
    phaseId,
    title,
    folder,
    tags,
    suites,
    smoke,
    notes: '',
  });
}

// -- Merge overrides -----------------------------------------

if (existsSync(OVERRIDES_PATH)) {
  const raw = readFileSync(OVERRIDES_PATH, 'utf-8');
  const overrides = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

  for (const ov of overrides) {
    const idx = manifest.findIndex((m) => String(m.phaseId) === String(ov.phaseId));
    if (idx >= 0) {
      // Deep merge: overrides win
      if (ov.tags) manifest[idx].tags = ov.tags;
      if (ov.suites) {
        if (ov.suites.fast) manifest[idx].suites.fast = ov.suites.fast;
        if (ov.suites.rc) manifest[idx].suites.rc = ov.suites.rc;
        if (ov.suites.full) manifest[idx].suites.full = ov.suites.full;
      }
      if (ov.smoke) {
        if (ov.smoke.uiRoutes) manifest[idx].smoke.uiRoutes = ov.smoke.uiRoutes;
        if (ov.smoke.apiEndpoints) manifest[idx].smoke.apiEndpoints = ov.smoke.apiEndpoints;
        if (ov.smoke.vistaProbes) manifest[idx].smoke.vistaProbes = ov.smoke.vistaProbes;
      }
      if (ov.notes) manifest[idx].notes = ov.notes;
    } else {
      // Override for unknown phase -- append
      manifest.push(ov);
    }
  }
}

// -- Write output --------------------------------------------

const output = {
  generatedAt: new Date().toISOString(),
  generator: 'qa/gauntlet/build-manifest.mjs',
  phaseCount: manifest.length,
  phases: manifest,
};

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
console.log(`Phase manifest generated: ${manifest.length} phases -> ${OUTPUT_PATH}`);
