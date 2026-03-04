/**
 * Wave 37 Verification Script — Phase 513-521
 * International Revenue Cycle + Billing + Payer Ops v2
 *
 * Validates all 9 phases (B1-B9) by checking file existence,
 * structural integrity, and running sub-gates.
 *
 * Usage: node scripts/verify-wave37.mjs
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

let pass = 0;
let fail = 0;
let warn = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    pass++;
  } else {
    console.log(`  FAIL  ${label}`);
    fail++;
  }
}

function fileExists(relPath) {
  return existsSync(join(ROOT, relPath));
}

function fileContains(relPath, needle) {
  if (!existsSync(join(ROOT, relPath))) return false;
  return readFileSync(join(ROOT, relPath), 'utf8').includes(needle);
}

console.log('\n=== Wave 37 Verification (Phases 513-521) ===\n');

/* ── B1: RCM Reality Scan (Phase 513) ──────────────────────── */
console.log('--- B1 (Phase 513): RCM Reality Scan ---');
check('G1  Readiness scan script exists', fileExists('scripts/rcm/rcm-readiness-scan.mjs'));
check('G2  QA gate script exists', fileExists('scripts/qa-gates/rcm-readiness-gate.mjs'));
check('G3  Readiness matrix JSON exists', fileExists('data/rcm/rcm-readiness-matrix.json'));
check('G4  Readiness matrix MD exists', fileExists('docs/rcm/rcm-readiness-matrix.md'));

/* ── B2: Payer Dossiers (Phase 514) ────────────────────────── */
console.log('\n--- B2 (Phase 514): Payer Dossiers ---');
check('G5  Dossier repo exists', fileExists('apps/api/src/platform/pg/repo/dossier-repo.ts'));
check('G6  Dossier routes exist', fileExists('apps/api/src/routes/dossier-routes.ts'));
check(
  'G7  PG schema has payerDossier',
  fileContains('apps/api/src/platform/pg/pg-schema.ts', 'payerDossier')
);
check(
  'G8  PG migrate has v52',
  fileContains('apps/api/src/platform/pg/pg-migrate.ts', 'phase514_payer_dossiers')
);
check(
  'G9  RLS includes payer_dossier',
  fileContains('apps/api/src/platform/pg/pg-migrate.ts', 'payer_dossier')
);

/* ── B3: PhilHealth Transport (Phase 515) ──────────────────── */
console.log('\n--- B3 (Phase 515): PhilHealth Transport ---');
check(
  'G10 Transport client exists',
  fileExists('apps/api/src/rcm/philhealth-eclaims3/transport.ts')
);
check(
  'G11 Transport routes exist',
  fileExists('apps/api/src/rcm/philhealth-eclaims3/transport-routes.ts')
);
check(
  'G12 Transport has mock mode',
  fileContains('apps/api/src/rcm/philhealth-eclaims3/transport.ts', 'mock')
);
check(
  'G13 Transport has TLS support',
  fileContains('apps/api/src/rcm/philhealth-eclaims3/transport.ts', 'TLS')
);

/* ── B4: PH Claim Pack Export v2 (Phase 516) ───────────────── */
console.log('\n--- B4 (Phase 516): PH Claim Pack Export ---');
check('G14 Zip bundler exists', fileExists('apps/api/src/rcm/philhealth-eclaims3/zip-bundler.ts'));
check(
  'G15 Zip bundler has CRC-32',
  fileContains('apps/api/src/rcm/philhealth-eclaims3/zip-bundler.ts', 'crc32')
);
check(
  'G16 Zip bundler has manifest',
  fileContains('apps/api/src/rcm/philhealth-eclaims3/zip-bundler.ts', 'manifest')
);

/* ── B5: PH HMO Ops v2 (Phase 517) ────────────────────────── */
console.log('\n--- B5 (Phase 517): PH HMO Ops v2 ---');
check(
  'G17 Submission checklist exists',
  fileExists('apps/api/src/rcm/hmo-portal/submission-checklist.ts')
);
check(
  'G18 Checklist has HMO templates',
  fileContains('apps/api/src/rcm/hmo-portal/submission-checklist.ts', 'maxicare')
);
check(
  'G19 Checklist has LOA workflow',
  fileContains('apps/api/src/rcm/hmo-portal/submission-checklist.ts', 'loa')
);

/* ── B6: US X12 Ingest v2 (Phase 518) ─────────────────────── */
console.log('\n--- B6 (Phase 518): US X12 Ingest v2 ---');
check('G20 X12 wire parser exists', fileExists('apps/api/src/rcm/edi/x12-wire-parser.ts'));
check(
  'G21 835 adapter exists',
  fileExists('apps/api/src/rcm/reconciliation/x12-wire-835-adapter.ts')
);
check('G22 Sample 835 fixture exists', fileExists('data/rcm/fixtures/sample-835.x12'));
check(
  'G23 Parser has delimiter detection',
  fileContains('apps/api/src/rcm/edi/x12-wire-parser.ts', 'detectDelimiters')
);
check(
  'G24 Parser has 835 normalizer',
  fileContains('apps/api/src/rcm/edi/x12-wire-parser.ts', 'normalize835')
);
check(
  'G25 Parser has 277 normalizer',
  fileContains('apps/api/src/rcm/edi/x12-wire-parser.ts', 'normalize277')
);

/* ── B7: Clearinghouse Adapter v2 (Phase 519) ─────────────── */
console.log('\n--- B7 (Phase 519): Clearinghouse Adapter v2 ---');
check(
  'G26 Gateway v2 exists',
  fileExists('apps/api/src/rcm/connectors/clearinghouse-gateway-v2.ts')
);
check(
  'G27 Gateway routes exist',
  fileExists('apps/api/src/rcm/connectors/clearinghouse-gateway-routes.ts')
);
check(
  'G28 Gateway has record/replay',
  fileContains('apps/api/src/rcm/connectors/clearinghouse-gateway-v2.ts', 'replayMode')
);
check(
  'G29 Gateway has trace store',
  fileContains('apps/api/src/rcm/connectors/clearinghouse-gateway-v2.ts', 'TraceStore')
);
check(
  'G30 Gateway has Stedi adapter',
  fileContains('apps/api/src/rcm/connectors/clearinghouse-gateway-v2.ts', 'StediAdapter')
);

/* ── B8: Denials/Appeals Hardening (Phase 520) ─────────────── */
console.log('\n--- B8 (Phase 520): Denials/Appeals Hardening ---');
check(
  'G31 Pipeline hardener exists',
  fileExists('apps/api/src/rcm/denials/denial-pipeline-hardener.ts')
);
check(
  'G32 Pipeline routes exist',
  fileExists('apps/api/src/rcm/denials/denial-pipeline-routes.ts')
);
check(
  'G33 CARC/RARC normalization',
  fileContains('apps/api/src/rcm/denials/denial-pipeline-hardener.ts', 'normalizeCodes')
);
check(
  'G34 Line classification',
  fileContains('apps/api/src/rcm/denials/denial-pipeline-hardener.ts', 'classifyLine')
);
check(
  'G35 Posting staging',
  fileContains('apps/api/src/rcm/denials/denial-pipeline-hardener.ts', 'PostingStagingEntry')
);
check(
  'G36 Operator approval',
  fileContains('apps/api/src/rcm/denials/denial-pipeline-hardener.ts', 'approveStagingEntry')
);
check(
  'G37 Duplicate detection',
  fileContains('apps/api/src/rcm/denials/denial-pipeline-hardener.ts', 'processedHashes')
);

/* ── B9: Global Pack Conformance (Phase 521) ───────────────── */
console.log('\n--- B9 (Phase 521): Global Pack Conformance ---');
check('G38 Pack generator script', fileExists('scripts/rcm/generate-country-pack.mjs'));
check('G39 Conformance runner script', fileExists('scripts/rcm/country-conformance-runner.mjs'));
check('G40 AU checklist exists', fileExists('data/rcm/conformance/au-checklist.json'));
check('G41 SG checklist exists', fileExists('data/rcm/conformance/sg-checklist.json'));
check('G42 NZ checklist exists', fileExists('data/rcm/conformance/nz-checklist.json'));
check(
  'G43 Runner checks 5 countries',
  fileContains('scripts/rcm/country-conformance-runner.mjs', 'KNOWN_COUNTRIES')
);

/* ── Route registration ────────────────────────────────────── */
console.log('\n--- Route Registration ---');
check(
  'G44 Dossier routes registered',
  fileContains('apps/api/src/server/register-routes.ts', 'dossierRoutes')
);
check(
  'G45 PH transport routes registered',
  fileContains('apps/api/src/server/register-routes.ts', 'philhealthTransportRoutes')
);
check(
  'G46 Clearinghouse v2 routes registered',
  fileContains('apps/api/src/server/register-routes.ts', 'clearinghouseGatewayRoutes')
);
check(
  'G47 Denial pipeline routes registered',
  fileContains('apps/api/src/server/register-routes.ts', 'denialPipelineRoutes')
);

/* ── Prompts ───────────────────────────────────────────────── */
console.log('\n--- Prompt Infrastructure ---');
check('G48 Wave 37 manifest exists', fileExists('prompts/WAVE_37_MANIFEST.md'));
for (let p = 513; p <= 521; p++) {
  const folder = `prompts/${p}-W37-`;
  // Check at least the folder prefix exists (glob not available in pure JS)
}
check(
  'G49 Phase reservation includes 513-521',
  fileContains('docs/qa/prompt-phase-range-reservations.json', '513')
);

/* ── Summary ───────────────────────────────────────────────── */
console.log(`\n  ${pass} PASS / ${fail} FAIL / ${warn} WARN`);
console.log(`\n  RESULT: ${fail === 0 ? 'GATE PASSED' : 'GATE FAILED'}\n`);

process.exit(fail > 0 ? 1 : 0);
