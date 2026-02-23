/**
 * Platform DB — Seed from committed JSON fixtures
 *
 * Phase 95B: Platform Persistence Unification
 *
 * Loads payer records from data/payers/*.json seed files into
 * the SQLite database. Idempotent: skips payers that already exist.
 *
 * This replaces the in-memory seed loading in payer-registry/registry.ts
 * and ph-hmo-registry.ts with durable DB storage.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { payer } from "./schema.js";
import { eq } from "drizzle-orm";

const __dirname_resolved = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, "..", "..", "..", "..", "..");
const PAYERS_DIR = join(REPO_ROOT, "data", "payers");

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
 * Seed payers from all data/payers/*.json files.
 * Skips records whose payerId already exists in the DB.
 * Returns count of inserted vs skipped.
 */
export function seedFromJsonFixtures(): { inserted: number; skipped: number; errors: string[] } {
  const db = getDb();
  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (!existsSync(PAYERS_DIR)) {
    return { inserted, skipped, errors: [`Payers directory not found: ${PAYERS_DIR}`] };
  }

  const jsonFiles = readdirSync(PAYERS_DIR).filter(f => f.endsWith(".json"));

  for (const file of jsonFiles) {
    // Skip registry-db.json (Phase 95 JSON persistence — being replaced)
    if (file === "registry-db.json" || file === "tenant-overrides.json") continue;

    const filePath = join(PAYERS_DIR, file);
    try {
      let raw = readFileSync(filePath, "utf-8");
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
        const existing = db.select({ id: payer.id })
          .from(payer)
          .where(eq(payer.id, p.payerId))
          .get();

        if (existing) {
          skipped++;
          continue;
        }

        // Normalize aliases — ensure JSON array string
        let aliasesJson: string;
        try {
          aliasesJson = JSON.stringify(Array.isArray(p.aliases) ? p.aliases : []);
        } catch {
          aliasesJson = "[]";
        }

        db.insert(payer).values({
          id: p.payerId,
          canonicalName: p.name,
          aliases: aliasesJson,
          countryCode: p.country ?? "PH",
          regulatorSource: null,
          regulatorLicenseNo: null,
          category: p.category ?? null,
          integrationMode: p.integrationMode ?? null,
          active: true,
          createdAt: now,
          updatedAt: now,
        }).run();

        inserted++;
      }
    } catch (err) {
      errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { inserted, skipped, errors };
}
