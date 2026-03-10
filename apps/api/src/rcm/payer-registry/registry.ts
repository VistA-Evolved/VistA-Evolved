/**
 * RCM -- Payer Registry
 *
 * Phase 38: In-memory payer catalog with seed data loading.
 *
 * Strategy: "No payer left out"
 * - US: ~900+ payers covered via clearinghouse EDI (seed file has top payers;
 *   full list imported from clearinghouse payer roster in production)
 * - PH: PhilHealth + licensed HMOs from Insurance Commission registry
 * - Add new payers via API or seed file; classify integration mode; onboard.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Payer, PayerFilter } from '../domain/payer.js';
import { matchesPayer } from '../domain/payer.js';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

/* -- Store ---------------------------------------------------- */

const payers = new Map<string, Payer>();
let initialized = false;

/* -- Seed Loading --------------------------------------------- */

function loadSeedFile(relativePath: string): Payer[] {
  // Resolve relative to repo root (apps/api/src/rcm/payer-registry -> ../../../../..)
  const repoRoot = join(__dirname_resolved, '..', '..', '..', '..', '..');
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    return [];
  }
  try {
    const raw = readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.payers) ? data.payers : [];
  } catch {
    return [];
  }
}

export function initPayerRegistry(): void {
  if (initialized) return;

  const seedFiles = [
    'data/payers/us_core.json',
    'data/payers/ph_hmos.json',
    'data/payers/au_core.json',
    'data/payers/sg_core.json',
    'data/payers/nz_core.json',
  ];

  for (const file of seedFiles) {
    const loaded = loadSeedFile(file);
    for (const p of loaded) {
      if (p.payerId) payers.set(p.payerId, p);
    }
  }

  initialized = true;
}

/* -- CRUD ----------------------------------------------------- */

export function getPayer(payerId: string): Payer | undefined {
  return payers.get(payerId);
}

export function listPayers(filter?: PayerFilter): {
  payers: Payer[];
  total: number;
  countries: string[];
  integrationModes: string[];
} {
  let result = Array.from(payers.values());

  if (filter) {
    result = result.filter((p) => matchesPayer(p, filter));
  }

  result.sort((a, b) => a.name.localeCompare(b.name));

  const total = result.length;
  const offset = filter?.offset ?? 0;
  const limit = filter?.limit ?? 100;
  const page = result.slice(offset, offset + limit);

  // Compute distinct values for filter UI
  const allPayers = Array.from(payers.values());
  const countries = [...new Set(allPayers.map((p) => p.country))].sort();
  const integrationModes = [...new Set(allPayers.map((p) => p.integrationMode))].sort();

  return { payers: page, total, countries, integrationModes };
}

export function upsertPayer(payer: Payer): void {
  payers.set(payer.payerId, payer);
}

export function getPayerStats(): {
  total: number;
  byCountry: Record<string, number>;
  byMode: Record<string, number>;
  byStatus: Record<string, number>;
} {
  const byCountry: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const p of payers.values()) {
    byCountry[p.country] = (byCountry[p.country] ?? 0) + 1;
    byMode[p.integrationMode] = (byMode[p.integrationMode] ?? 0) + 1;
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return { total: payers.size, byCountry, byMode, byStatus };
}
