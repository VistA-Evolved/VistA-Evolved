#!/usr/bin/env node

/**
 * Evidence Gate -- CI quality gate for payer integration evidence
 *
 * Phase 112: Fails if:
 *   1. Payer seed files declare api/fhir/portal modes without evidence entries
 *   2. Connector code references undeclared payer endpoints
 *   3. Docs claim integration functionality without backing
 *
 * Usage:
 *   node scripts/qa-gates/evidence-gate.mjs [--strict] [--json]
 *
 * Exit codes:
 *   0 = all checks pass (or warnings only in non-strict mode)
 *   1 = failures found
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PAYER_DATA_DIR = join(ROOT, 'data', 'payers');
const CONNECTOR_DIR = join(ROOT, 'apps', 'api', 'src', 'rcm', 'connectors');
const EVIDENCE_DIR = join(ROOT, 'data', 'evidence');
const DOCS_DIR = join(ROOT, 'docs');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const jsonOutput = args.includes('--json');

/** Integration modes that require evidence backing */
const EVIDENCE_REQUIRED_MODES = new Set(['direct_api', 'fhir_payer', 'government_portal']);

/** Modes where evidence is recommended but not blocking */
const EVIDENCE_RECOMMENDED_MODES = new Set(['clearinghouse_edi', 'portal_batch']);

// -- Gate results --------------------------------------

const results = {
  passed: 0,
  warned: 0,
  failed: 0,
  checks: [],
};

function pass(gate, detail) {
  results.passed++;
  results.checks.push({ gate, status: 'PASS', detail });
  if (!jsonOutput) console.log(`  PASS  ${gate}: ${detail}`);
}

function warn(gate, detail) {
  results.warned++;
  results.checks.push({ gate, status: 'WARN', detail });
  if (!jsonOutput) console.log(`  WARN  ${gate}: ${detail}`);
}

function fail(gate, detail) {
  results.failed++;
  results.checks.push({ gate, status: 'FAIL', detail });
  if (!jsonOutput) console.log(`  FAIL  ${gate}: ${detail}`);
}

// -- Gate 1: Payer seed files -- modes vs evidence ------

function checkPayerSeeds() {
  if (!jsonOutput) console.log('\n== Gate 1: Payer Seed Evidence Coverage ==');

  if (!existsSync(PAYER_DATA_DIR)) {
    warn('payer-seeds', 'data/payers/ directory not found');
    return;
  }

  const seedFiles = readdirSync(PAYER_DATA_DIR).filter((f) => f.endsWith('.json'));
  if (seedFiles.length === 0) {
    warn('payer-seeds', 'No payer seed files found');
    return;
  }

  // Load all evidence entries if evidence directory exists
  const evidenceEntries = loadEvidenceEntries();

  let totalPayers = 0;
  let requiresEvidence = 0;
  let missingEvidence = 0;
  const gaps = [];

  for (const file of seedFiles) {
    const raw = readFileSync(join(PAYER_DATA_DIR, file), 'utf-8');
    // Strip BOM (BUG-064)
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    let data;
    try {
      data = JSON.parse(clean);
    } catch {
      warn('payer-seeds', `Failed to parse ${file}`);
      continue;
    }

    const payers = data.payers ?? data;
    if (!Array.isArray(payers)) continue;

    for (const p of payers) {
      totalPayers++;
      const mode = p.integrationMode;

      if (EVIDENCE_REQUIRED_MODES.has(mode)) {
        requiresEvidence++;
        const hasEvidence = evidenceEntries.some((e) => e.payerId === p.payerId);
        if (!hasEvidence) {
          missingEvidence++;
          gaps.push({
            payerId: p.payerId,
            name: p.name,
            mode,
            file,
          });
        }
      } else if (strict && EVIDENCE_RECOMMENDED_MODES.has(mode)) {
        requiresEvidence++;
        const hasEvidence = evidenceEntries.some((e) => e.payerId === p.payerId);
        if (!hasEvidence) {
          missingEvidence++;
          gaps.push({
            payerId: p.payerId,
            name: p.name,
            mode,
            file,
          });
        }
      }
    }
  }

  pass('payer-seeds-loaded', `${totalPayers} payers across ${seedFiles.length} seed files`);

  if (requiresEvidence === 0) {
    pass('payer-evidence-required', 'No payers require evidence (all not_classified or manual)');
  } else if (missingEvidence === 0) {
    pass(
      'payer-evidence-coverage',
      `All ${requiresEvidence} evidence-required payers have backing`
    );
  } else {
    const msg = `${missingEvidence}/${requiresEvidence} payers with api/fhir/portal mode lack evidence`;
    if (strict) {
      fail('payer-evidence-coverage', msg);
    } else {
      warn('payer-evidence-coverage', msg);
    }
    // List first 10 gaps
    for (const g of gaps.slice(0, 10)) {
      const detail = `  -> ${g.payerId} (${g.name}) mode=${g.mode} in ${g.file}`;
      if (!jsonOutput) console.log(detail);
    }
    if (gaps.length > 10 && !jsonOutput) {
      console.log(`  ... and ${gaps.length - 10} more`);
    }
  }
}

// -- Gate 2: Connector code -- undeclared endpoint references --

function checkConnectorEndpoints() {
  if (!jsonOutput) console.log('\n== Gate 2: Connector Endpoint Declarations ==');

  if (!existsSync(CONNECTOR_DIR)) {
    warn('connector-dir', 'connectors/ directory not found');
    return;
  }

  const connectorFiles = readdirSync(CONNECTOR_DIR).filter(
    (f) => f.endsWith('.ts') && f !== 'types.ts'
  );

  // Scan for hardcoded external URLs in connector files
  const urlPattern = /https?:\/\/[^\s'"`)]+/g;
  const internalUrls = /localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com|placeholder/i;
  let externalUrlCount = 0;
  const externalUrls = [];

  for (const file of connectorFiles) {
    const content = readFileSync(join(CONNECTOR_DIR, file), 'utf-8');
    const matches = content.match(urlPattern) ?? [];

    for (const url of matches) {
      if (!internalUrls.test(url)) {
        externalUrlCount++;
        externalUrls.push({ file, url });
      }
    }
  }

  if (externalUrlCount === 0) {
    pass(
      'connector-endpoints',
      `${connectorFiles.length} connector files have no undeclared external URLs`
    );
  } else {
    const msg = `${externalUrlCount} external URL(s) found in connector code`;
    if (strict) {
      fail('connector-endpoints', msg);
    } else {
      warn('connector-endpoints', msg);
    }
    for (const u of externalUrls.slice(0, 5)) {
      if (!jsonOutput) console.log(`  -> ${u.file}: ${u.url}`);
    }
  }
}

// -- Gate 3: Docs -- ungrounded integration claims ------

function checkDocsGrounding() {
  if (!jsonOutput) console.log('\n== Gate 3: Documentation Grounding ==');

  const claimPatterns = [
    /supports?\s+real[- ]time\s+API/gi,
    /live\s+(?:API|FHIR)\s+integration/gi,
    /production[- ]ready\s+(?:API|EDI|portal)\s+connection/gi,
    /direct\s+(?:API|FHIR)\s+submission/gi,
  ];

  const runbookDir = join(DOCS_DIR, 'runbooks');
  if (!existsSync(runbookDir)) {
    warn('docs-grounding', 'docs/runbooks/ not found');
    return;
  }

  const mdFiles = readdirSync(runbookDir).filter((f) => f.endsWith('.md'));
  let ungroundedClaims = 0;
  const findings = [];

  for (const file of mdFiles) {
    const content = readFileSync(join(runbookDir, file), 'utf-8');
    for (const pattern of claimPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        // Check if there's an evidence reference nearby
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(content.length, match.index + match[0].length + 200);
        const context = content.slice(contextStart, contextEnd);

        if (!/evidence|source|reference|verified|grounded/i.test(context)) {
          ungroundedClaims++;
          findings.push({ file, claim: match[0] });
        }
      }
    }
  }

  if (ungroundedClaims === 0) {
    pass('docs-grounding', `${mdFiles.length} runbook files have no ungrounded integration claims`);
  } else {
    const msg = `${ungroundedClaims} ungrounded integration claim(s) in docs`;
    if (strict) {
      fail('docs-grounding', msg);
    } else {
      warn('docs-grounding', msg);
    }
    for (const f of findings.slice(0, 5)) {
      if (!jsonOutput) console.log(`  -> ${f.file}: "${f.claim}"`);
    }
  }
}

// -- Gate 4: Evidence template exists ------------------

function checkTemplate() {
  if (!jsonOutput) console.log('\n== Gate 4: Research Template ==');

  const templatePath = join(DOCS_DIR, 'templates', 'payer-evidence-template.md');
  if (existsSync(templatePath)) {
    pass('evidence-template', 'payer-evidence-template.md exists');
  } else {
    fail('evidence-template', 'docs/templates/payer-evidence-template.md missing');
  }
}

// -- Gate 5: Evidence route code exists ----------------

function checkRouteCode() {
  if (!jsonOutput) console.log('\n== Gate 5: Evidence Route Code ==');

  const routePath = join(ROOT, 'apps', 'api', 'src', 'rcm', 'evidence', 'evidence-routes.ts');
  const repoPath = join(ROOT, 'apps', 'api', 'src', 'rcm', 'evidence', 'evidence-registry-repo.ts');

  if (existsSync(routePath)) {
    pass('evidence-routes', 'evidence-routes.ts exists');
  } else {
    fail('evidence-routes', 'evidence-routes.ts missing');
  }

  if (existsSync(repoPath)) {
    pass('evidence-repo', 'evidence-registry-repo.ts exists');
  } else {
    fail('evidence-repo', 'evidence-registry-repo.ts missing');
  }
}

// -- Gate 6: Evidence staleness check (Phase 113B) -----

const STALENESS_THRESHOLD_DAYS = 180;

function checkStaleness() {
  if (!jsonOutput) console.log('\n== Gate 6: Evidence Staleness ==');

  const evidence = loadEvidenceEntries();
  if (evidence.length === 0) {
    warn('staleness', 'No evidence entries found to check');
    return;
  }

  const now = Date.now();
  const thresholdMs = STALENESS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  let stale = 0;
  let missing = 0;
  const staleIds = [];

  for (const entry of evidence) {
    const verifiedAt = entry.lastVerifiedAt || entry.last_verified_at;
    if (!verifiedAt) {
      missing++;
      continue;
    }
    const age = now - new Date(verifiedAt).getTime();
    if (age > thresholdMs) {
      stale++;
      staleIds.push(entry.payerId || entry.payer_id || entry.id || 'unknown');
    }
  }

  if (missing > 0) {
    const msg = `${missing}/${evidence.length} entries missing lastVerifiedAt`;
    if (strict) fail('staleness', msg);
    else warn('staleness', msg);
  }

  if (stale > 0) {
    const msg = `${stale}/${evidence.length} entries stale (>${STALENESS_THRESHOLD_DAYS}d): ${staleIds.slice(0, 5).join(', ')}${staleIds.length > 5 ? '...' : ''}`;
    if (strict) fail('staleness', msg);
    else warn('staleness', msg);
  }

  if (stale === 0 && missing === 0) {
    pass(
      'staleness',
      `All ${evidence.length} entries verified within ${STALENESS_THRESHOLD_DAYS}d`
    );
  }
}

// -- Helpers -------------------------------------------

function loadEvidenceEntries() {
  // Load from data/evidence/*.json if any exist
  if (!existsSync(EVIDENCE_DIR)) return [];

  const files = readdirSync(EVIDENCE_DIR).filter((f) => f.endsWith('.json'));
  const entries = [];

  for (const file of files) {
    try {
      const raw = readFileSync(join(EVIDENCE_DIR, file), 'utf-8');
      const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      const data = JSON.parse(clean);
      if (Array.isArray(data)) {
        entries.push(...data);
      } else if (data.evidence && Array.isArray(data.evidence)) {
        entries.push(...data.evidence);
      } else if (data.payerId) {
        entries.push(data);
      }
    } catch {
      // skip malformed files
    }
  }

  return entries;
}

// -- Main ----------------------------------------------

if (!jsonOutput) {
  console.log('=== Evidence Gate -- Phase 112 ===');
  console.log(`Mode: ${strict ? 'STRICT' : 'STANDARD'}`);
}

checkPayerSeeds();
checkConnectorEndpoints();
checkDocsGrounding();
checkTemplate();
checkRouteCode();
checkStaleness();

if (!jsonOutput) {
  console.log('\n=== Summary ===');
  console.log(`  PASS: ${results.passed}`);
  console.log(`  WARN: ${results.warned}`);
  console.log(`  FAIL: ${results.failed}`);
}

if (jsonOutput) {
  console.log(JSON.stringify(results, null, 2));
}

const exitCode = results.failed > 0 ? 1 : 0;
if (!jsonOutput) {
  console.log(`\nExit code: ${exitCode}`);
}
process.exit(exitCode);
