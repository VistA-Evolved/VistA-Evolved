/**
 * De-Identification & Pseudonymization Service — Phase 364 (W19-P3)
 *
 * Configurable de-id/pseudonymization for analytics datasets.
 * Default mode is "strict" — all direct identifiers removed.
 *
 * DISCLAIMER: This is an engineering tool, NOT legal or compliance advice.
 * Consult your compliance officer and legal counsel before using
 * de-identified datasets for any purpose.
 *
 * ADR: docs/decisions/ADR-DEIDENTIFICATION-POSTURE.md
 */

import { createHash, createHmac, randomBytes } from "node:crypto";
import { log } from "../lib/logger.js";
import type {
  DeidConfig,
  DeidMode,
  ExtractRecord,
} from "./extract-types.js";
import {
  DIRECT_IDENTIFIER_FIELDS,
  INLINE_PHI_PATTERNS,
  DEFAULT_DEID_CONFIG,
} from "./extract-types.js";

// ── Per-tenant config store ─────────────────────────────────────────────

const tenantDeidConfigs = new Map<string, DeidConfig>();
const DEFAULT_HMAC_SECRET = randomBytes(32).toString("hex");

export function getDeidConfig(tenantId: string): DeidConfig {
  const stored = tenantDeidConfigs.get(tenantId);
  if (stored) return stored;
  return {
    tenantId,
    ...DEFAULT_DEID_CONFIG,
    pseudonymizationSecret: DEFAULT_HMAC_SECRET,
  };
}

export function setDeidConfig(config: DeidConfig): DeidConfig {
  if (!config.pseudonymizationSecret) {
    config.pseudonymizationSecret = DEFAULT_HMAC_SECRET;
  }
  const tid = config.tenantId || "default";
  config.tenantId = tid;
  tenantDeidConfigs.set(tid, config);
  log.info(`Deid config updated for tenant ${tid}: mode=${config.mode}`);
  return config;
}

export function listDeidConfigs(): DeidConfig[] {
  return Array.from(tenantDeidConfigs.values());
}

// ── Core De-identification ──────────────────────────────────────────────

/**
 * Apply de-identification to a set of extract records.
 * Returns new records with identifiers removed/pseudonymized.
 */
export function deidentifyRecords(
  records: ExtractRecord[],
  config: DeidConfig,
): { records: ExtractRecord[]; stats: DeidStats } {
  const stats: DeidStats = {
    totalRecords: records.length,
    fieldsRedacted: 0,
    fieldsPseudonymized: 0,
    freeTextScrubbedCount: 0,
    mode: config.mode,
  };

  if (config.mode === "raw") {
    return { records, stats };
  }

  const processed = records.map((r) => ({
    ...r,
    data: deidentifyObject(r.data, config, stats),
  }));

  return { records: processed, stats };
}

export interface DeidStats {
  totalRecords: number;
  fieldsRedacted: number;
  fieldsPseudonymized: number;
  freeTextScrubbedCount: number;
  mode: DeidMode;
}

/**
 * De-identify a single object. Recurse into nested objects.
 */
function deidentifyObject(
  obj: Record<string, unknown>,
  config: DeidConfig,
  stats: DeidStats,
  depth = 0,
): Record<string, unknown> {
  if (depth > 8) return obj;
  const result: Record<string, unknown> = {};

  const allBlockedFields = new Set([
    ...DIRECT_IDENTIFIER_FIELDS,
    ...(config.customRedactFields || []),
  ]);

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    if (config.redactDirectIdentifiers && allBlockedFields.has(key)) {
      if (config.mode === "pseudonymized" && typeof value === "string") {
        result[key] = pseudonymize(value, config.pseudonymizationSecret!);
        stats.fieldsPseudonymized++;
      } else {
        result[key] = "[REDACTED]";
        stats.fieldsRedacted++;
      }
    } else if (
      config.redactDirectIdentifiers &&
      [...allBlockedFields].some((f) => f.toLowerCase() === keyLower)
    ) {
      if (config.mode === "pseudonymized" && typeof value === "string") {
        result[key] = pseudonymize(value, config.pseudonymizationSecret!);
        stats.fieldsPseudonymized++;
      } else {
        result[key] = "[REDACTED]";
        stats.fieldsRedacted++;
      }
    } else if (typeof value === "string" && config.redactFreeText) {
      const scrubbed = scrubFreeText(value);
      if (scrubbed !== value) stats.freeTextScrubbedCount++;
      result[key] = scrubbed;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = deidentifyObject(value as Record<string, unknown>, config, stats, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ── Pseudonymization ────────────────────────────────────────────────────

/**
 * Deterministic pseudonymization using HMAC-SHA256.
 * Same input + same key = same output, enabling joins across datasets.
 */
export function pseudonymize(value: string, secret: string): string {
  return "PSE-" + createHmac("sha256", secret).update(value).digest("hex").slice(0, 16);
}

// ── Free-text scrubbing ─────────────────────────────────────────────────

/**
 * Scrub inline PHI patterns from free text.
 */
function scrubFreeText(text: string): string {
  let result = text;
  for (const { pattern, replacement } of INLINE_PHI_PATTERNS) {
    // Clone regex to avoid state issues with global flag
    const re = new RegExp(pattern.source, pattern.flags);
    result = result.replace(re, replacement);
  }
  return result;
}

// ── Denylist Scan ───────────────────────────────────────────────────────

export interface DenylistResult {
  passed: boolean;
  violations: DenylistViolation[];
  scannedRecords: number;
  scannedFields: number;
}

export interface DenylistViolation {
  recordId: string;
  field: string;
  pattern: string;
  snippet: string;
}

/**
 * Scan de-identified records for residual PHI patterns.
 * Returns pass/fail with any violations found.
 */
export function runDenylistScan(records: ExtractRecord[]): DenylistResult {
  const violations: DenylistViolation[] = [];
  let scannedFields = 0;

  for (const record of records) {
    for (const [field, value] of Object.entries(record.data)) {
      if (typeof value !== "string") continue;
      scannedFields++;

      // Check for known identifier field names that should have been redacted
      if (DIRECT_IDENTIFIER_FIELDS.has(field) && !value.startsWith("[") && !value.startsWith("PSE-")) {
        violations.push({
          recordId: record.id,
          field,
          pattern: "direct_identifier_field",
          snippet: value.slice(0, 30),
        });
      }

      // Check for inline PHI patterns
      for (const { pattern, replacement } of INLINE_PHI_PATTERNS) {
        const re = new RegExp(pattern.source, pattern.flags);
        const match = re.exec(value);
        if (match) {
          violations.push({
            recordId: record.id,
            field,
            pattern: replacement,
            snippet: match[0].slice(0, 30),
          });
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    scannedRecords: records.length,
    scannedFields,
  };
}

// ── Hash utility ────────────────────────────────────────────────────────

export function hashForAudit(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
