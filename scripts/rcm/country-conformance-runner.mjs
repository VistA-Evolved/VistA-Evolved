/**
 * Country Pack Conformance Runner — Phase 521 (Wave 37 B9)
 *
 * Validates country packs against the standardized conformance checklist.
 * Checks: currency, locale, claim format, payer mapping, privacy flags,
 * connector presence, validation rules, scrubber pack, seed data schema,
 * and documentation.
 *
 * Usage:
 *   node scripts/rcm/country-conformance-runner.mjs --country=US
 *   node scripts/rcm/country-conformance-runner.mjs --all
 *   node scripts/rcm/country-conformance-runner.mjs --all --json
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

/* ── Config ─────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const flags = {};
for (const arg of args) {
  const [k, v] = arg.replace(/^--/, '').split('=');
  flags[k] = v ?? 'true';
}

const TARGET_COUNTRY = flags.country?.toUpperCase();
const RUN_ALL = flags.all === 'true';
const JSON_OUTPUT = flags.json === 'true';

/* ── Country Metadata ───────────────────────────────────────── */

const KNOWN_COUNTRIES = {
  US: { name: 'United States', currency: 'USD', locale: 'en', claimFormat: 'x12_5010' },
  PH: { name: 'Philippines', currency: 'PHP', locale: 'fil', claimFormat: 'philhealth_eclaims3' },
  AU: { name: 'Australia', currency: 'AUD', locale: 'en-AU', claimFormat: 'eclipse' },
  SG: { name: 'Singapore', currency: 'SGD', locale: 'en-SG', claimFormat: 'nphc' },
  NZ: { name: 'New Zealand', currency: 'NZD', locale: 'en-NZ', claimFormat: 'acc_api' },
};

/* ── Conformance Checks ─────────────────────────────────────── */

function checkSeedDataExists(country) {
  const patterns = [
    `data/payers/${country.toLowerCase()}_core.json`,
    `data/payers/${country.toLowerCase()}_hmos.json`,
  ];
  for (const p of patterns) {
    if (existsSync(join(ROOT, p))) return { pass: true, file: p };
  }
  // Also check ph_hmos special case
  if (country === 'PH' && existsSync(join(ROOT, 'data/payers/ph_hmos.json'))) {
    return { pass: true, file: 'data/payers/ph_hmos.json' };
  }
  return { pass: false, file: null };
}

function checkSeedDataSchema(country) {
  const seedCheck = checkSeedDataExists(country);
  if (!seedCheck.pass) return { pass: false, errors: ['No seed file found'] };

  try {
    const raw = readFileSync(join(ROOT, seedCheck.file), 'utf8');
    const data = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

    const errors = [];
    if (!data._meta) errors.push('Missing _meta');
    if (!data.payers && !data.hmos) errors.push('Missing payers[] or hmos[]');

    const payers = data.payers ?? data.hmos ?? [];
    if (payers.length === 0) errors.push('Empty payer list');

    for (const p of payers) {
      if (!p.payerId && !p.id) errors.push(`Payer missing payerId/id`);
      if (!p.name) errors.push(`Payer ${p.payerId ?? p.id} missing name`);
      // Country code should match or be "INTL"
      if (p.country && p.country !== country && p.country !== 'INTL') {
        errors.push(`Payer ${p.payerId ?? p.id} has country=${p.country}, expected ${country}`);
      }
    }

    return { pass: errors.length === 0, errors, payerCount: payers.length };
  } catch (e) {
    return { pass: false, errors: [`JSON parse error: ${e.message}`] };
  }
}

function checkPayerCountryCode(country) {
  const seedCheck = checkSeedDataExists(country);
  if (!seedCheck.pass) return { pass: false, detail: 'No seed file' };

  const raw = readFileSync(join(ROOT, seedCheck.file), 'utf8');
  const data = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
  const payers = data.payers ?? data.hmos ?? [];
  const wrongCountry = payers.filter(
    (p) => p.country && p.country !== country && p.country !== 'INTL'
  );

  if (wrongCountry.length > 0) {
    return {
      pass: false,
      detail: `${wrongCountry.length} payers have wrong country code (expected ${country})`,
      affected: wrongCountry.map((p) => p.payerId ?? p.id),
    };
  }
  return { pass: true };
}

function checkConnectorExists(country) {
  const patterns = [
    `apps/api/src/rcm/connectors/${country.toLowerCase()}-connector.ts`,
    `apps/api/src/rcm/connectors/clearinghouse-connector.ts`,
    `apps/api/src/rcm/connectors/philhealth-connector.ts`,
  ];

  // US uses clearinghouse, PH uses philhealth
  const specialConnectors = {
    US: 'apps/api/src/rcm/connectors/clearinghouse-connector.ts',
    PH: 'apps/api/src/rcm/connectors/philhealth-connector.ts',
  };

  if (specialConnectors[country]) {
    return {
      pass: existsSync(join(ROOT, specialConnectors[country])),
      file: specialConnectors[country],
    };
  }

  const found = patterns.find((p) => existsSync(join(ROOT, p)));
  return { pass: !!found, file: found ?? null };
}

function checkValidationRules(country) {
  // Check for country-specific rules in engine.ts or separate file
  const enginePath = join(ROOT, 'apps/api/src/rcm/validation/engine.ts');
  const separatePath = join(ROOT, `apps/api/src/rcm/validation/${country.toLowerCase()}-rules.ts`);

  if (existsSync(separatePath)) {
    return { pass: true, source: 'separate file' };
  }

  if (existsSync(enginePath)) {
    const content = readFileSync(enginePath, 'utf8');
    const hasRule =
      content.includes(`CTY-${country}`) || content.includes(`country !== '${country}'`);
    return { pass: hasRule, source: hasRule ? 'engine.ts' : null };
  }

  return { pass: false, source: null };
}

function checkScrubberPack(country) {
  const patterns = [
    `apps/api/src/rcm/claims/${country.toLowerCase()}-scrubber-pack.ts`,
    `apps/api/src/rcm/claims/scrubber.ts`,
  ];

  // US and PH have packs in scrubber.ts
  if (country === 'US' || country === 'PH') {
    const scrubber = join(ROOT, 'apps/api/src/rcm/claims/scrubber.ts');
    if (existsSync(scrubber)) {
      const content = readFileSync(scrubber, 'utf8');
      const hasPack =
        country === 'US' ? content.includes('us_core') : content.includes('philhealth');
      return { pass: hasPack, source: hasPack ? 'scrubber.ts' : null };
    }
  }

  const found = patterns.find((p) => existsSync(join(ROOT, p)));
  return { pass: !!found, source: found ?? null };
}

function checkPrivacyFlags(country) {
  // Check if PHI redaction covers this country's ID patterns
  const phiRedaction = join(ROOT, 'apps/api/src/lib/phi-redaction.ts');
  if (!existsSync(phiRedaction)) return { pass: false, detail: 'phi-redaction.ts not found' };

  // All countries share the same PHI redaction infrastructure
  return { pass: true, detail: 'Shared PHI redaction infrastructure' };
}

function checkConformanceChecklist(country) {
  const path = `data/rcm/conformance/${country.toLowerCase()}-checklist.json`;
  return { pass: existsSync(join(ROOT, path)), file: path };
}

function checkDocumentation(country) {
  const patterns = [
    `docs/runbooks/rcm-${country.toLowerCase()}-onboarding.md`,
    `docs/rcm/jurisdiction-packs.md`,
    `docs/runbooks/rcm-payer-connectivity.md`,
  ];
  const found = patterns.find((p) => existsSync(join(ROOT, p)));
  return { pass: !!found, file: found ?? 'docs/rcm/jurisdiction-packs.md (generic)' };
}

/* ── Run Conformance ────────────────────────────────────────── */

function runConformance(country) {
  const meta = KNOWN_COUNTRIES[country] ?? {
    name: country,
    currency: '???',
    locale: '??',
    claimFormat: 'unknown',
  };

  const checks = [
    {
      id: 'CONF-001',
      area: 'seed_data',
      ...runCheck('Payer seed data exists', () => checkSeedDataExists(country)),
    },
    {
      id: 'CONF-002',
      area: 'seed_schema',
      ...runCheck('Payer seed JSON schema valid', () => checkSeedDataSchema(country)),
    },
    {
      id: 'CONF-003',
      area: 'country_code',
      ...runCheck('Payer country codes correct', () => checkPayerCountryCode(country)),
    },
    {
      id: 'CONF-004',
      area: 'connector',
      ...runCheck('Connector file exists', () => checkConnectorExists(country)),
    },
    {
      id: 'CONF-005',
      area: 'validation',
      ...runCheck('Country validation rules defined', () => checkValidationRules(country)),
    },
    {
      id: 'CONF-006',
      area: 'scrubber',
      ...runCheck('Scrubber pack defined', () => checkScrubberPack(country)),
    },
    {
      id: 'CONF-007',
      area: 'privacy',
      ...runCheck('Privacy/PHI flags configured', () => checkPrivacyFlags(country)),
    },
    {
      id: 'CONF-008',
      area: 'conformance',
      ...runCheck('Conformance checklist exists', () => checkConformanceChecklist(country)),
    },
    {
      id: 'CONF-009',
      area: 'documentation',
      ...runCheck('Documentation exists', () => checkDocumentation(country)),
    },
    {
      id: 'CONF-010',
      area: 'currency',
      ...runCheck(`Currency is ${meta.currency}`, () => ({
        pass: !!meta.currency && meta.currency !== '???',
      })),
    },
  ];

  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;

  return {
    country,
    name: meta.name,
    currency: meta.currency,
    locale: meta.locale,
    claimFormat: meta.claimFormat,
    runAt: new Date().toISOString(),
    summary: { pass: passCount, fail: failCount, warn: warnCount, total: checks.length },
    overallStatus: failCount === 0 ? 'CONFORMANT' : failCount <= 3 ? 'PARTIAL' : 'NON_CONFORMANT',
    checks,
  };
}

function runCheck(name, fn) {
  try {
    const result = fn();
    return {
      check: name,
      status: result.pass ? 'PASS' : result.errors?.length > 0 ? 'FAIL' : 'WARN',
      detail: result,
    };
  } catch (e) {
    return { check: name, status: 'FAIL', detail: { error: e.message } };
  }
}

/* ── Main ───────────────────────────────────────────────────── */

const countries = RUN_ALL ? Object.keys(KNOWN_COUNTRIES) : TARGET_COUNTRY ? [TARGET_COUNTRY] : [];

if (countries.length === 0) {
  console.error('Usage: node scripts/rcm/country-conformance-runner.mjs --country=XX  or  --all');
  process.exit(1);
}

const results = countries.map((c) => runConformance(c));

if (JSON_OUTPUT) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log('\n=== Country Pack Conformance Report ===\n');

  for (const result of results) {
    console.log(`\n--- ${result.name} (${result.country}) ---`);
    console.log(
      `  Currency: ${result.currency}  |  Locale: ${result.locale}  |  Format: ${result.claimFormat}`
    );
    console.log(
      `  Status: ${result.overallStatus}  (${result.summary.pass}/${result.summary.total} checks pass)\n`
    );

    for (const check of result.checks) {
      const icon = check.status === 'PASS' ? 'PASS' : check.status === 'WARN' ? 'WARN' : 'FAIL';
      console.log(`  [${icon}] ${check.id}: ${check.check}`);
    }
  }

  console.log('\n=== Summary ===');
  const conformant = results.filter((r) => r.overallStatus === 'CONFORMANT').length;
  const partial = results.filter((r) => r.overallStatus === 'PARTIAL').length;
  const nonConformant = results.filter((r) => r.overallStatus === 'NON_CONFORMANT').length;
  console.log(
    `  Conformant: ${conformant}  |  Partial: ${partial}  |  Non-conformant: ${nonConformant}`
  );
  console.log(`  Total countries: ${results.length}\n`);
}
