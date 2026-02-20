/**
 * RCM — Payer Catalog Importer Interface
 *
 * Phase 40 (Superseding): Formal interface for ingesting payer catalogs
 * from clearinghouse rosters, government registries, and CSV/JSON files.
 *
 * Importers:
 *   CsvPayerImporter — Generic CSV file with configurable column mapping
 *   JsonPayerImporter — JSON array of payer objects (our seed file format)
 *   (Future: ClearinghouseRosterImporter, GovernmentRegistryImporter)
 */

import type { Payer, IntegrationMode, PayerCountry, PayerStatus } from "../domain/payer.js";

/* ── Importer Interface ────────────────────────────────────── */

export interface PayerImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; payerId?: string; error: string }>;
}

export interface PayerCatalogImporter {
  readonly name: string;
  readonly sourceType: "csv" | "json" | "api" | "registry";

  /** Validate the import source before processing */
  validate(source: string): { valid: boolean; error?: string; rowCount?: number };

  /** Parse and return payer objects (does not persist) */
  parse(source: string, defaults?: Partial<Payer>): {
    payers: Payer[];
    errors: Array<{ row: number; error: string }>;
  };
}

/* ── CSV Importer ──────────────────────────────────────────── */

export interface CsvColumnMapping {
  payerId: string;         // column name for payerId (required)
  name: string;            // column name for name (required)
  country?: string;        // column name for country
  integrationMode?: string;
  status?: string;
  category?: string;
  clearinghousePayerId?: string;
  naic?: string;
  enrollmentRequired?: string;
  enrollmentNotes?: string;
  aliases?: string;        // comma-separated in cell
}

const DEFAULT_CSV_MAPPING: CsvColumnMapping = {
  payerId: "payerId",
  name: "name",
  country: "country",
  integrationMode: "integrationMode",
  status: "status",
  category: "category",
  clearinghousePayerId: "clearinghousePayerId",
  naic: "naic",
  enrollmentRequired: "enrollmentRequired",
  enrollmentNotes: "enrollmentNotes",
  aliases: "aliases",
};

export class CsvPayerImporter implements PayerCatalogImporter {
  readonly name = "csv-payer-importer";
  readonly sourceType = "csv" as const;

  constructor(private mapping: CsvColumnMapping = DEFAULT_CSV_MAPPING) {}

  validate(csv: string): { valid: boolean; error?: string; rowCount?: number } {
    if (!csv || csv.trim().length === 0) return { valid: false, error: "Empty CSV" };
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return { valid: false, error: "CSV must have header + at least 1 row" };

    const headers = this.parseCsvLine(lines[0]);
    const lcHeaders = headers.map(h => h.toLowerCase().trim());

    if (!lcHeaders.includes(this.mapping.payerId.toLowerCase())) {
      return { valid: false, error: `Missing required column: ${this.mapping.payerId}` };
    }
    if (!lcHeaders.includes(this.mapping.name.toLowerCase())) {
      return { valid: false, error: `Missing required column: ${this.mapping.name}` };
    }

    return { valid: true, rowCount: lines.length - 1 };
  }

  parse(csv: string, defaults?: Partial<Payer>): {
    payers: Payer[];
    errors: Array<{ row: number; error: string }>;
  } {
    const payers: Payer[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return { payers, errors };

    const headers = this.parseCsvLine(lines[0]).map(h => h.trim());
    const headerIndex = new Map<string, number>();
    headers.forEach((h, i) => headerIndex.set(h.toLowerCase(), i));

    const getCol = (row: string[], col?: string): string | undefined => {
      if (!col) return undefined;
      const idx = headerIndex.get(col.toLowerCase());
      return idx !== undefined ? row[idx]?.trim() : undefined;
    };

    const now = new Date().toISOString();

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = this.parseCsvLine(lines[i]);
        const payerId = getCol(cols, this.mapping.payerId);
        const name = getCol(cols, this.mapping.name);

        if (!payerId || !name) {
          errors.push({ row: i + 1, error: "Missing payerId or name" });
          continue;
        }

        const country = (getCol(cols, this.mapping.country) as PayerCountry) ??
                         defaults?.country ?? "US";
        const integrationMode = (getCol(cols, this.mapping.integrationMode) as IntegrationMode) ??
                                defaults?.integrationMode ?? "not_classified";
        const status = (getCol(cols, this.mapping.status) as PayerStatus) ??
                       defaults?.status ?? "active";
        const aliasStr = getCol(cols, this.mapping.aliases);

        payers.push({
          payerId,
          name,
          country: country as PayerCountry,
          integrationMode: integrationMode as IntegrationMode,
          status: status as PayerStatus,
          category: getCol(cols, this.mapping.category) ?? defaults?.category,
          clearinghousePayerId: getCol(cols, this.mapping.clearinghousePayerId),
          naic: getCol(cols, this.mapping.naic),
          enrollmentRequired: (getCol(cols, this.mapping.enrollmentRequired) === "true") ||
                              defaults?.enrollmentRequired || false,
          enrollmentNotes: getCol(cols, this.mapping.enrollmentNotes),
          aliases: aliasStr ? aliasStr.split(",").map(a => a.trim()).filter(Boolean) : undefined,
          endpoints: [],
          createdAt: now,
          updatedAt: now,
        });
      } catch (e) {
        errors.push({ row: i + 1, error: String(e) });
      }
    }

    return { payers, errors };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
}

/* ── JSON Importer ─────────────────────────────────────────── */

export class JsonPayerImporter implements PayerCatalogImporter {
  readonly name = "json-payer-importer";
  readonly sourceType = "json" as const;

  validate(source: string): { valid: boolean; error?: string; rowCount?: number } {
    try {
      const data = JSON.parse(source);
      const arr = Array.isArray(data) ? data : data.payers;
      if (!Array.isArray(arr)) return { valid: false, error: "Expected array or {payers:[...]}" };
      return { valid: true, rowCount: arr.length };
    } catch (e) {
      return { valid: false, error: `Invalid JSON: ${String(e)}` };
    }
  }

  parse(source: string, defaults?: Partial<Payer>): {
    payers: Payer[];
    errors: Array<{ row: number; error: string }>;
  } {
    const payers: Payer[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    const now = new Date().toISOString();

    try {
      const data = JSON.parse(source);
      const arr: any[] = Array.isArray(data) ? data : data.payers ?? [];

      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (!p.payerId || !p.name) {
          errors.push({ row: i + 1, error: "Missing payerId or name" });
          continue;
        }
        payers.push({
          payerId: p.payerId,
          name: p.name,
          country: p.country ?? defaults?.country ?? "US",
          integrationMode: p.integrationMode ?? defaults?.integrationMode ?? "not_classified",
          status: p.status ?? defaults?.status ?? "active",
          category: p.category ?? defaults?.category,
          clearinghousePayerId: p.clearinghousePayerId,
          naic: p.naic,
          philhealthCode: p.philhealthCode,
          endpoints: p.endpoints ?? [],
          enrollmentRequired: p.enrollmentRequired ?? defaults?.enrollmentRequired ?? false,
          enrollmentNotes: p.enrollmentNotes,
          enrollmentUrl: p.enrollmentUrl,
          parentOrg: p.parentOrg,
          aliases: p.aliases,
          createdAt: p.createdAt ?? now,
          updatedAt: p.updatedAt ?? now,
        });
      }
    } catch (e) {
      errors.push({ row: 0, error: `Parse error: ${String(e)}` });
    }

    return { payers, errors };
  }
}
