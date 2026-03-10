#!/usr/bin/env node
/**
 * scripts/qa-gates/i18n-coverage-gate.mjs -- Phase 497 (W34-P7)
 *
 * QA gate that validates all country-pack-supported locales have
 * message bundles in both apps/web and apps/portal.
 *
 * Reads country-packs/<pack>/values.json for supportedLocales[], then checks:
 *   - apps/web/public/messages/{locale}.json exists and is valid JSON
 *   - apps/portal/public/messages/{locale}.json exists and is valid JSON
 *   - Each key in en.json exists in every other locale (coverage %)
 *
 * Exit: 0 = pass (or WARN-only), 1 = FAIL
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PACKS_DIR = join(ROOT, 'country-packs');
const WEB_MESSAGES_DIR = join(ROOT, 'apps', 'web', 'public', 'messages');
const PORTAL_MESSAGES_DIR = join(ROOT, 'apps', 'portal', 'public', 'messages');

let passed = 0;
let warned = 0;
let failed = 0;

function pass(gate, detail) {
  passed++;
  console.log(`  PASS  ${gate}: ${detail}`);
}

function warn(gate, detail) {
  warned++;
  console.log(`  WARN  ${gate}: ${detail}`);
}

function fail(gate, detail) {
  failed++;
  console.log(`  FAIL  ${gate}: ${detail}`);
}

// -- Collect all supported locales from packs -------------------

function loadPackLocales() {
  const packDirs = readdirSync(PACKS_DIR).filter((d) => {
    const p = join(PACKS_DIR, d);
    return statSync(p).isDirectory() && existsSync(join(p, 'values.json'));
  });

  const results = [];
  for (const dir of packDirs) {
    try {
      const raw = readFileSync(join(PACKS_DIR, dir, 'values.json'), 'utf-8');
      const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
      const pack = JSON.parse(stripped);
      results.push({
        countryCode: pack.countryCode || dir,
        locales: pack.supportedLocales || [pack.defaultLocale || 'en'],
      });
    } catch (err) {
      fail('pack-parse', `${dir}/values.json: ${err.message}`);
    }
  }
  return results;
}

function checkMessageFile(dir, locale, appName) {
  const filePath = join(dir, `${locale}.json`);
  if (!existsSync(filePath)) {
    warn('locale-missing', `${appName}/messages/${locale}.json does not exist`);
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const stripped = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const data = JSON.parse(stripped);
    if (typeof data !== 'object' || data === null) {
      fail('locale-invalid', `${appName}/messages/${locale}.json is not a valid object`);
      return null;
    }
    pass('locale-exists', `${appName}/messages/${locale}.json (${Object.keys(data).length} keys)`);
    return data;
  } catch (err) {
    fail('locale-parse', `${appName}/messages/${locale}.json: ${err.message}`);
    return null;
  }
}

function checkKeyCoverage(enKeys, localeData, locale, appName) {
  if (!enKeys || !localeData) return;

  const missing = enKeys.filter((k) => !(k in localeData));
  const coverage = (((enKeys.length - missing.length) / enKeys.length) * 100).toFixed(1);

  if (missing.length === 0) {
    pass('key-coverage', `${appName}/${locale}: 100% (${enKeys.length} keys)`);
  } else if (missing.length <= 5) {
    warn(
      'key-coverage',
      `${appName}/${locale}: ${coverage}% (missing ${missing.length}: ${missing.slice(0, 5).join(', ')})`
    );
  } else {
    warn('key-coverage', `${appName}/${locale}: ${coverage}% (missing ${missing.length} keys)`);
  }
}

// -- Main -------------------------------------------------------

console.log('\n=== i18n Coverage Gate (Phase 497) ===\n');

// Gate 1: Country packs exist
if (!existsSync(PACKS_DIR)) {
  fail('packs-dir', 'country-packs/ directory does not exist');
  process.exit(1);
}

const packs = loadPackLocales();
if (packs.length === 0) {
  fail('packs-loaded', 'No country packs found');
  process.exit(1);
}
pass('packs-loaded', `${packs.length} packs found: ${packs.map((p) => p.countryCode).join(', ')}`);

// Collect all unique locales
const allLocales = [...new Set(packs.flatMap((p) => p.locales))];
pass('locales-collected', `${allLocales.length} unique locales: ${allLocales.join(', ')}`);

// Gate 2: Check web messages
console.log('\n--- apps/web ---');
const webEn = checkMessageFile(WEB_MESSAGES_DIR, 'en', 'web');
const webEnKeys = webEn ? Object.keys(webEn) : [];

for (const locale of allLocales) {
  if (locale === 'en') continue;
  const data = checkMessageFile(WEB_MESSAGES_DIR, locale, 'web');
  checkKeyCoverage(webEnKeys, data, locale, 'web');
}

// Gate 3: Check portal messages
console.log('\n--- apps/portal ---');
const portalEn = checkMessageFile(PORTAL_MESSAGES_DIR, 'en', 'portal');
const portalEnKeys = portalEn ? Object.keys(portalEn) : [];

for (const locale of allLocales) {
  if (locale === 'en') continue;
  const data = checkMessageFile(PORTAL_MESSAGES_DIR, locale, 'portal');
  checkKeyCoverage(portalEnKeys, data, locale, 'portal');
}

// Gate 4: Per-pack summary
console.log('\n--- Per-Pack Summary ---');
for (const pack of packs) {
  const missingWeb = pack.locales.filter((l) => !existsSync(join(WEB_MESSAGES_DIR, `${l}.json`)));
  const missingPortal = pack.locales.filter(
    (l) => !existsSync(join(PORTAL_MESSAGES_DIR, `${l}.json`))
  );

  if (missingWeb.length === 0 && missingPortal.length === 0) {
    pass(
      'pack-coverage',
      `${pack.countryCode}: all ${pack.locales.length} locales have message files`
    );
  } else {
    if (missingWeb.length > 0) {
      warn('pack-coverage', `${pack.countryCode} web: missing ${missingWeb.join(', ')}`);
    }
    if (missingPortal.length > 0) {
      warn('pack-coverage', `${pack.countryCode} portal: missing ${missingPortal.join(', ')}`);
    }
  }
}

// -- Summary ----------------------------------------------------

console.log(`\n  --- Summary: ${passed} passed, ${warned} warned, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);
