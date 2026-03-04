/**
 * Platform DB — Seed from committed JSON fixtures (PostgreSQL)
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Equivalent of ../db/seed.ts but targets Postgres via PG repos.
 * Loads payer records from data/payers/*.json seed files.
 * Idempotent: skips payers that already exist.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPgDb } from './pg-db.js';
import { payer } from './pg-schema.js';
import { eq } from 'drizzle-orm';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..');
const PAYERS_DIR = join(REPO_ROOT, 'data', 'payers');

interface SeedPayer {
  payerId: string;
  name: string;
  country?: string;
  integrationMode?: string;
  status?: string;
  category?: string;
  aliases?: string[];
  [key: string]: unknown;
}

/**
 * Seed payers from all data/payers/*.json files into Postgres.
 * Skips records whose payerId already exists in the DB.
 * Returns count of inserted vs skipped.
 */
export async function pgSeedFromJsonFixtures(): Promise<{
  inserted: number;
  skipped: number;
  errors: string[];
}> {
  const db = getPgDb();
  const now = new Date();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (!existsSync(PAYERS_DIR)) {
    return { inserted, skipped, errors: [`Payers directory not found: ${PAYERS_DIR}`] };
  }

  const jsonFiles = readdirSync(PAYERS_DIR).filter((f) => f.endsWith('.json'));

  for (const file of jsonFiles) {
    // Skip non-seed files
    if (file === 'registry-db.json' || file === 'tenant-overrides.json') continue;

    const filePath = join(PAYERS_DIR, file);
    try {
      let raw = readFileSync(filePath, 'utf-8');
      // Strip BOM (BUG-064)
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

      const data = JSON.parse(raw);
      const payerList: SeedPayer[] = Array.isArray(data.payers) ? data.payers : [];

      for (const p of payerList) {
        if (!p.payerId || !p.name) {
          errors.push(`${file}: skipped entry missing payerId or name`);
          continue;
        }

        // Check if already exists
        const existing = await db
          .select({ id: payer.id })
          .from(payer)
          .where(eq(payer.id, p.payerId));

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Normalize aliases
        let aliases: unknown[];
        try {
          aliases = Array.isArray(p.aliases) ? p.aliases : [];
        } catch {
          aliases = [];
        }

        await db.insert(payer).values({
          id: p.payerId,
          tenantId: 'default',
          canonicalName: p.name,
          aliases,
          countryCode: p.country ?? 'PH',
          regulatorSource: null,
          regulatorLicenseNo: null,
          category: p.category ?? null,
          integrationMode: p.integrationMode ?? null,
          active: true,
          createdAt: now,
          updatedAt: now,
        });

        inserted++;
      }
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { inserted, skipped, errors };
}
