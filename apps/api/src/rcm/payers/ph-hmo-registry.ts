/**
 * PH HMO Registry — Phase 93: PH HMO Deepening Pack
 *
 * Loads and validates the canonical 27-entry PH HMO registry
 * from data/payers/ph-hmo-registry.json.
 *
 * This is a deepened registry with:
 *   - Evidence-backed capability data per HMO
 *   - Insurance Commission canonical source references
 *   - Contracting task lists
 *   - Integration mode classification (manual vs portal)
 *
 * The existing ph_hmos.json seed (Phase 38/40) remains as the
 * lightweight payer seed for the core registry.
 * This file is the enriched reference for billing staff workflows.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname_resolved = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

/* ── Types ──────────────────────────────────────────────────── */

export type HmoCapabilityStatus =
  | "available"       // publicly confirmed as available
  | "portal"          // available via provider portal login
  | "manual"          // requires manual process (phone/fax/email)
  | "unknown_publicly" // no public evidence found
  | "unavailable";    // confirmed as not available

export interface HmoCapabilities {
  loa: HmoCapabilityStatus;
  eligibility: HmoCapabilityStatus;
  claimsSubmission: HmoCapabilityStatus;
  claimStatus: HmoCapabilityStatus;
  remittance: HmoCapabilityStatus;
  memberPortal: HmoCapabilityStatus;
  providerPortal: HmoCapabilityStatus;
}

export interface HmoEvidence {
  kind: "website" | "provider_portal" | "loa_instructions" | "api_docs" | "contract" | "other";
  url: string;
  title: string;
  retrievedAt: string;
  notes?: string;
}

export interface HmoCanonicalSource {
  url: string;
  asOfDate: string;
  retrievedAt: string;
}

export type HmoIntegrationMode = "manual" | "portal" | "api" | "email";

export type HmoStatus =
  | "in_progress"        // actively onboarding / portal access being set up
  | "contracting_needed" // need to initiate contracting
  | "active"             // fully integrated
  | "suspended";         // temporarily suspended

export interface PhHmo {
  payerId: string;
  legalName: string;
  brandNames: string[];
  type: "HMO";
  country: "PH";
  canonicalSource: HmoCanonicalSource;
  capabilities: HmoCapabilities;
  integrationMode: HmoIntegrationMode;
  evidence: HmoEvidence[];
  status: HmoStatus;
  contractingTasks?: string[];
}

export interface PhHmoRegistryMeta {
  schema: string;
  description: string;
  canonicalSource: {
    url: string;
    title: string;
    authority: string;
    asOfDate: string;
    retrievedAt: string;
  };
  count: number;
  lastUpdated: string;
  maintainer: string;
  notes: string;
}

export interface PhHmoRegistryData {
  _meta: PhHmoRegistryMeta;
  hmos: PhHmo[];
}

/* ── Store ──────────────────────────────────────────────────── */

const hmoStore = new Map<string, PhHmo>();
let registryMeta: PhHmoRegistryMeta | null = null;
let initialized = false;

/* ── Validation ─────────────────────────────────────────────── */

export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  count: number;
}

function validateRegistry(data: PhHmoRegistryData): RegistryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must have _meta
  if (!data._meta) {
    errors.push("Missing _meta block");
  }

  // Must have hmos array
  if (!Array.isArray(data.hmos)) {
    errors.push("Missing or invalid hmos array");
    return { valid: false, errors, warnings, count: 0 };
  }

  const count = data.hmos.length;

  // Count check
  if (data._meta?.count !== count) {
    warnings.push(`_meta.count (${data._meta?.count}) does not match actual count (${count})`);
  }

  // Unique payerIds
  const ids = new Set<string>();
  for (const hmo of data.hmos) {
    if (!hmo.payerId) {
      errors.push("HMO entry missing payerId");
      continue;
    }
    if (ids.has(hmo.payerId)) {
      errors.push(`Duplicate payerId: ${hmo.payerId}`);
    }
    ids.add(hmo.payerId);

    // Required fields
    if (!hmo.legalName) errors.push(`${hmo.payerId}: missing legalName`);
    if (hmo.type !== "HMO") errors.push(`${hmo.payerId}: type must be "HMO"`);
    if (hmo.country !== "PH") errors.push(`${hmo.payerId}: country must be "PH"`);
    if (!hmo.canonicalSource?.url) errors.push(`${hmo.payerId}: missing canonicalSource.url`);
    if (!hmo.capabilities) errors.push(`${hmo.payerId}: missing capabilities`);

    // Warn on unknown capability status
    if (hmo.capabilities) {
      const allUnknown = Object.values(hmo.capabilities).every(v => v === "unknown_publicly");
      if (allUnknown) {
        warnings.push(`${hmo.payerId}: all capabilities are unknown_publicly — research needed`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, count };
}

/* ── Loading ────────────────────────────────────────────────── */

export function initPhHmoRegistry(): RegistryValidationResult {
  if (initialized) {
    return { valid: true, errors: [], warnings: ["Already initialized"], count: hmoStore.size };
  }

  // Resolve registry JSON from repo root
  const repoRoot = join(__dirname_resolved, "..", "..", "..", "..", "..");
  const registryPath = join(repoRoot, "data", "payers", "ph-hmo-registry.json");

  if (!existsSync(registryPath)) {
    initialized = true;
    return { valid: false, errors: [`Registry file not found: ${registryPath}`], warnings: [], count: 0 };
  }

  try {
    const raw = readFileSync(registryPath, "utf-8");
    // Strip BOM if present (BUG-064: PowerShell-generated JSON can have BOM)
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const data: PhHmoRegistryData = JSON.parse(clean);

    const validation = validateRegistry(data);
    if (!validation.valid) {
      initialized = true;
      return validation;
    }

    registryMeta = data._meta;
    for (const hmo of data.hmos) {
      hmoStore.set(hmo.payerId, hmo);
    }

    initialized = true;
    return validation;
  } catch (err) {
    initialized = true;
    return {
      valid: false,
      errors: [`Failed to parse registry: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
      count: 0,
    };
  }
}

/* ── Queries ────────────────────────────────────────────────── */

export function getPhHmo(payerId: string): PhHmo | undefined {
  return hmoStore.get(payerId);
}

export function listPhHmos(filter?: {
  status?: HmoStatus;
  integrationMode?: HmoIntegrationMode;
  search?: string;
}): PhHmo[] {
  let result = Array.from(hmoStore.values());

  if (filter?.status) {
    result = result.filter(h => h.status === filter.status);
  }
  if (filter?.integrationMode) {
    result = result.filter(h => h.integrationMode === filter.integrationMode);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(h => {
      const haystack = [h.legalName, h.payerId, ...h.brandNames].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  return result.sort((a, b) => a.legalName.localeCompare(b.legalName));
}

export function getPhHmoStats(): {
  total: number;
  byStatus: Record<string, number>;
  byIntegrationMode: Record<string, number>;
  withPortal: number;
  contractingNeeded: number;
  lastUpdated: string | null;
} {
  const all = Array.from(hmoStore.values());
  const byStatus: Record<string, number> = {};
  const byIntegrationMode: Record<string, number> = {};
  let withPortal = 0;
  let contractingNeeded = 0;

  for (const h of all) {
    byStatus[h.status] = (byStatus[h.status] || 0) + 1;
    byIntegrationMode[h.integrationMode] = (byIntegrationMode[h.integrationMode] || 0) + 1;
    if (h.capabilities.providerPortal === "available") withPortal++;
    if (h.status === "contracting_needed") contractingNeeded++;
  }

  return {
    total: all.length,
    byStatus,
    byIntegrationMode,
    withPortal,
    contractingNeeded,
    lastUpdated: registryMeta?.lastUpdated ?? null,
  };
}

export function getPhHmoMeta(): PhHmoRegistryMeta | null {
  return registryMeta;
}

export function getPhHmoRegistryValidation(): RegistryValidationResult {
  const repoRoot = join(__dirname_resolved, "..", "..", "..", "..", "..");
  const registryPath = join(repoRoot, "data", "payers", "ph-hmo-registry.json");

  if (!existsSync(registryPath)) {
    return { valid: false, errors: ["Registry file not found"], warnings: [], count: 0 };
  }

  try {
    const raw = readFileSync(registryPath, "utf-8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const data: PhHmoRegistryData = JSON.parse(clean);
    return validateRegistry(data);
  } catch (err) {
    return {
      valid: false,
      errors: [`Parse error: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
      count: 0,
    };
  }
}
