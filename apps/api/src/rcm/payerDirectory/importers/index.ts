/**
 * Payer Directory — Importer Registry
 *
 * Phase 44: Central registry of all authoritative importers.
 * Run all importers or select by country/id.
 */

import type { PayerImporter, ImportResult } from '../types.js';
import { phInsuranceCommissionImporter } from './ph-insurance-commission.js';
import { auApraImporter } from './au-apra.js';
import { usClearinghouseImporter, usAvailityImporter, usOfficeAllyImporter } from './us-clearinghouse.js';
import { sgNzGatewayImporter } from './sg-nz-gateways.js';
import type { PayerCountry } from '../../domain/payer.js';

/* ── All Importers ──────────────────────────────────────────── */

const ALL_IMPORTERS: PayerImporter[] = [
  phInsuranceCommissionImporter,
  auApraImporter,
  usClearinghouseImporter,
  usAvailityImporter,
  usOfficeAllyImporter,
  sgNzGatewayImporter,
];

/* ── Registry Functions ─────────────────────────────────────── */

export function getImporter(id: string): PayerImporter | undefined {
  return ALL_IMPORTERS.find(i => i.id === id);
}

export function listImporters(): Array<{
  id: string;
  name: string;
  country: PayerCountry;
  supportsFileImport: boolean;
}> {
  return ALL_IMPORTERS.map(i => ({
    id: i.id,
    name: i.name,
    country: i.country,
    supportsFileImport: typeof i.importFromFile === 'function',
  }));
}

/**
 * Run all snapshot importers and return combined results.
 */
export function runAllImporters(): ImportResult[] {
  const results: ImportResult[] = [];
  for (const importer of ALL_IMPORTERS) {
    try {
      results.push(importer.importFromSnapshot());
    } catch (err) {
      results.push({
        importerId: importer.id,
        country: importer.country,
        payers: [],
        source: { authority: importer.name },
        importedAt: new Date().toISOString(),
        errors: [`Importer failed: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
  }
  return results;
}

/**
 * Run importers for a specific country.
 */
export function runImportersByCountry(country: PayerCountry): ImportResult[] {
  const importers = ALL_IMPORTERS.filter(i => i.country === country);
  const results: ImportResult[] = [];
  for (const importer of importers) {
    try {
      results.push(importer.importFromSnapshot());
    } catch (err) {
      results.push({
        importerId: importer.id,
        country: importer.country,
        payers: [],
        source: { authority: importer.name },
        importedAt: new Date().toISOString(),
        errors: [`Importer failed: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
  }
  return results;
}

export { ALL_IMPORTERS };
