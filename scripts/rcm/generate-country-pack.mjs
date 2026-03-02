/**
 * Country Pack Template Generator — Phase 521 (Wave 37 B9)
 *
 * Generates a standardized country pack scaffold for new markets.
 * Each pack includes: payer seed JSON, validation rules, connector stub,
 * scrubber pack definition, and conformance checklist.
 *
 * Usage:
 *   node scripts/rcm/generate-country-pack.mjs --country=MY --name=Malaysia
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
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

const COUNTRY = (flags.country ?? '').toUpperCase();
const NAME = flags.name ?? COUNTRY;
const CURRENCY = flags.currency ?? 'USD';
const LOCALE = flags.locale ?? 'en';

if (!COUNTRY || COUNTRY.length !== 2) {
  console.error('Usage: node scripts/rcm/generate-country-pack.mjs --country=XX --name="Country Name" [--currency=XXX] [--locale=xx]');
  process.exit(1);
}

/* ── Templates ──────────────────────────────────────────────── */

function generateSeedJson() {
  return JSON.stringify({
    _meta: {
      description: `${NAME} payer registry seed data`,
      source: 'VistA-Evolved country pack generator (Phase 521)',
      lastUpdated: new Date().toISOString().split('T')[0],
      notes: `Scaffold — populate with actual ${NAME} payers`,
    },
    payers: [
      {
        payerId: `${COUNTRY}-GOV-001`,
        name: `${NAME} Government Health Insurance`,
        country: COUNTRY,
        integrationMode: 'government_portal',
        status: 'active',
        category: 'government',
        enrollmentRequired: true,
        enrollmentNotes: `Register with ${NAME} national health authority`,
        endpoints: [
          {
            purpose: 'claims',
            protocol: 'rest',
            url: `https://api.health.gov.${COUNTRY.toLowerCase()}/claims/v1`,
            notes: 'Production endpoint — requires facility registration',
          },
        ],
        aliases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        payerId: `${COUNTRY}-PVT-001`,
        name: `${NAME} Private Insurer Example`,
        country: COUNTRY,
        integrationMode: 'not_classified',
        status: 'active',
        category: 'commercial',
        enrollmentRequired: true,
        enrollmentNotes: 'Contact provider relations for EDI enrollment',
        endpoints: [],
        aliases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  }, null, 2);
}

function generateValidationRules() {
  return `/**
 * ${NAME} (${COUNTRY}) Validation Rules — Phase 521 Country Pack
 *
 * Country-specific claim validation rules for ${NAME}.
 * Add to the countrySpecificRules array in validation/engine.ts.
 */

import type { ValidationRule, ValidationEdit } from './engine-types.js';

export const ${COUNTRY.toLowerCase()}Rules: ValidationRule[] = [
  {
    id: 'CTY-${COUNTRY}-001',
    category: 'country_specific',
    severity: 'error',
    blocksSubmission: true,
    description: '${NAME} national ID required for government claims',
    check(claim: any): ValidationEdit | null {
      if (claim.country !== '${COUNTRY}') return null;
      const isGov = claim.payerId?.startsWith('${COUNTRY}-GOV');
      if (!isGov) return null;
      const hasNationalId = claim.subscriber?.memberId?.length > 0;
      if (hasNationalId) return null;
      return {
        ruleId: 'CTY-${COUNTRY}-001',
        severity: 'error',
        field: 'subscriber.memberId',
        message: '${NAME} national health ID is required for government payer claims',
        suggestion: 'Obtain patient national health ID from registration system',
      };
    },
  },
  {
    id: 'CTY-${COUNTRY}-002',
    category: 'country_specific',
    severity: 'warning',
    blocksSubmission: false,
    description: '${NAME} currency validation (${CURRENCY})',
    check(claim: any): ValidationEdit | null {
      if (claim.country !== '${COUNTRY}') return null;
      // Placeholder: verify amounts are in ${CURRENCY}
      return null;
    },
  },
];
`;
}

function generateConnectorStub() {
  return `/**
 * ${NAME} (${COUNTRY}) Connector Stub — Phase 521 Country Pack
 *
 * Scaffold connector for ${NAME} payer connectivity.
 * Implement the real transport when ready.
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from './types.js';

export class ${capitalize(NAME.replace(/\s+/g, ''))}Connector implements RcmConnector {
  readonly id = '${COUNTRY.toLowerCase()}-gateway';
  readonly name = '${NAME} Gateway';
  readonly supportedModes = ['government_portal', 'direct_api'];
  readonly supportedTransactions: X12TransactionSet[] = ['837P', '837I', '835', '270', '271'];

  async initialize(): Promise<void> {
    // Load ${COUNTRY} gateway credentials from environment
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>,
  ): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [{
        code: '${COUNTRY}_NOT_IMPLEMENTED',
        description: '${NAME} connector not yet implemented — integration pending',
        severity: 'error',
      }],
      metadata: { connector: this.id, country: '${COUNTRY}' },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [{ code: 'NOT_IMPLEMENTED', description: 'Status check not implemented', severity: 'error' }],
    };
  }

  async fetchResponses(since?: string): Promise<Array<{
    transactionSet: X12TransactionSet;
    payload: string;
    receivedAt: string;
  }>> {
    return [];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    return { healthy: false, details: '${NAME} connector scaffold — not yet implemented' };
  }

  async shutdown(): Promise<void> {}
}
`;
}

function generateScrubberPack() {
  return `/**
 * ${NAME} (${COUNTRY}) Scrubber Pack — Phase 521 Country Pack
 *
 * Claim scrubbing rules specific to ${NAME} market.
 * Register in scrubber.ts determinePacks() to auto-select.
 */

export const ${COUNTRY.toLowerCase()}ScrubberPack = {
  id: '${COUNTRY.toLowerCase()}_core',
  name: '${NAME} Core Rules',
  country: '${COUNTRY}',
  currency: '${CURRENCY}',
  locale: '${LOCALE}',
  rules: [
    {
      id: '${COUNTRY}-SCRUB-001',
      description: '${NAME} claim format validation',
      severity: 'error' as const,
      check: (claim: any) => {
        // Placeholder: validate ${NAME}-specific claim format
        return null;
      },
    },
    {
      id: '${COUNTRY}-SCRUB-002',
      description: '${NAME} provider registration check',
      severity: 'warning' as const,
      check: (claim: any) => {
        // Placeholder: verify provider is registered with ${NAME} authorities
        return null;
      },
    },
  ],
};
`;
}

function generateConformanceChecklist() {
  return JSON.stringify({
    country: COUNTRY,
    name: NAME,
    currency: CURRENCY,
    locale: LOCALE,
    generatedAt: new Date().toISOString(),
    conformanceChecklist: [
      { id: 'CONF-001', area: 'currency', check: `All amounts use ${CURRENCY}`, status: 'pending' },
      { id: 'CONF-002', area: 'locale', check: `Date formats match ${LOCALE} locale`, status: 'pending' },
      { id: 'CONF-003', area: 'claim_format', check: 'Claim structure matches national spec', status: 'pending' },
      { id: 'CONF-004', area: 'payer_mapping', check: 'At least 1 payer seed record exists', status: 'pending' },
      { id: 'CONF-005', area: 'privacy_flags', check: 'PHI redaction rules configured', status: 'pending' },
      { id: 'CONF-006', area: 'connector', check: 'Connector stub exists and registered', status: 'pending' },
      { id: 'CONF-007', area: 'validation', check: 'Country-specific validation rules defined', status: 'pending' },
      { id: 'CONF-008', area: 'scrubber', check: 'Scrubber pack defined', status: 'pending' },
      { id: 'CONF-009', area: 'seed_data', check: 'Payer seed JSON schema valid', status: 'pending' },
      { id: 'CONF-010', area: 'documentation', check: 'Runbook for country onboarding exists', status: 'pending' },
    ],
  }, null, 2);
}

/* ── File Output ────────────────────────────────────────────── */

function writeIfNew(path, content) {
  const abs = join(ROOT, path);
  const dir = dirname(abs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(abs)) {
    console.log(`  SKIP (exists): ${path}`);
    return false;
  }
  writeFileSync(abs, content, 'utf8');
  console.log(`  CREATE: ${path}`);
  return true;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Main ───────────────────────────────────────────────────── */

console.log(`\nGenerating country pack for ${NAME} (${COUNTRY})...\n`);

const files = [
  [`data/payers/${COUNTRY.toLowerCase()}_core.json`, generateSeedJson()],
  [`apps/api/src/rcm/validation/${COUNTRY.toLowerCase()}-rules.ts`, generateValidationRules()],
  [`apps/api/src/rcm/connectors/${COUNTRY.toLowerCase()}-connector.ts`, generateConnectorStub()],
  [`apps/api/src/rcm/claims/${COUNTRY.toLowerCase()}-scrubber-pack.ts`, generateScrubberPack()],
  [`data/rcm/conformance/${COUNTRY.toLowerCase()}-checklist.json`, generateConformanceChecklist()],
];

let created = 0;
let skipped = 0;
for (const [path, content] of files) {
  if (writeIfNew(path, content)) created++;
  else skipped++;
}

console.log(`\nDone: ${created} files created, ${skipped} skipped (already exist).`);
console.log(`\nNext steps:`);
console.log(`  1. Edit data/payers/${COUNTRY.toLowerCase()}_core.json with real payer data`);
console.log(`  2. Add ${COUNTRY.toLowerCase()}_core.json to payer-registry seedFiles array`);
console.log(`  3. Implement connector transport in ${COUNTRY.toLowerCase()}-connector.ts`);
console.log(`  4. Add validation rules to engine.ts countrySpecificRules`);
console.log(`  5. Run conformance runner: node scripts/rcm/country-conformance-runner.mjs --country=${COUNTRY}`);
