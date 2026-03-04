/**
 * Payer Persistence — Phase 95: Payer Registry Persistence + Audit
 *
 * JSON-file-backed durable store for the payer registry.
 * In-memory Map cache for fast reads, atomic writes to disk.
 *
 * Architecture:
 *   - Global payers stored in data/payers/registry-db.json
 *   - Tenant overrides stored in data/payers/tenant-overrides.json
 *   - Evidence metadata stored alongside payer records
 *   - Audit trail in separate append-only JSONL file
 *
 * This replaces the read-only JSON loader from Phase 93 with a
 * read-write persistent store. The original ph-hmo-registry.json
 * is the seed data, imported via POST /admin/payers/import.
 *
 * Migration plan:
 *   1. Current: JSON file + in-memory cache (survives restarts)
 *   2. Next: PostgreSQL when app DB is introduced
 *   3. Production: PostgreSQL + row-level audit + tenant schemas
 *
 * No credentials stored. Vault interface defined for future use.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renameSync } from 'node:fs';
import { blocksJsonStores, getRuntimeMode } from '../../platform/runtime-mode.js';
import type {
  PhHmo,
  PhHmoRegistryData,
  HmoCapabilities,
  HmoStatus,
  HmoIntegrationMode,
  HmoEvidence,
} from './ph-hmo-registry.js';

const __dirname_resolved =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, '..', '..', '..', '..', '..');
const DATA_DIR = join(REPO_ROOT, 'data', 'payers');
const REGISTRY_DB_PATH = join(DATA_DIR, 'registry-db.json');
const TENANT_OVERRIDES_PATH = join(DATA_DIR, 'tenant-overrides.json');

/* ── Types ──────────────────────────────────────────────────── */

/** A payer record in the persistent store (extends PhHmo with persistence metadata) */
export interface PersistedPayer extends PhHmo {
  /** When this record was first imported/created */
  importedAt: string;
  /** Last modification timestamp */
  updatedAt: string;
  /** SHA-256 hash of the record at import time (for drift detection) */
  importHash: string;
  /** Provenance of the original import */
  provenance: PayerProvenance;
}

export interface PayerProvenance {
  sourceType: 'insurance_commission_snapshot' | 'manual_entry' | 'csv_import' | 'api_sync';
  sourceUrl?: string;
  retrievedAt: string;
  importedBy: string;
  fileHash?: string;
}

/** Tenant-scoped override for a payer */
export interface TenantPayerOverride {
  tenantId: string;
  payerId: string;
  /** Override capabilities (merged over global baseline) */
  capabilityOverrides?: Partial<HmoCapabilities>;
  /** Tenant-specific contracting tasks */
  contractingTasks?: string[];
  /** Tenant-specific status override */
  statusOverride?: HmoStatus;
  /** Tenant-specific integration mode override */
  integrationModeOverride?: HmoIntegrationMode;
  /** Credential vault reference (NEVER store actual credentials) */
  vaultRef?: string;
  /** Tenant-specific routing preferences */
  routingPreferences?: {
    preferredSubmissionChannel?: string;
    fallbackChannel?: string;
    notes?: string;
  };
  /** Enablement: is this payer active for this tenant? */
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

/** DB file schema */
interface RegistryDbFile {
  _meta: {
    schema: 'payer-registry-db-v1';
    lastModified: string;
    payerCount: number;
  };
  payers: PersistedPayer[];
}

interface TenantOverridesFile {
  _meta: {
    schema: 'tenant-payer-overrides-v1';
    lastModified: string;
  };
  overrides: TenantPayerOverride[];
}

/** Vault interface — no implementation stores secrets in plaintext */
export interface VaultInterface {
  getSecret(vaultRef: string): Promise<string | null>;
  setSecret(vaultRef: string, value: string): Promise<void>;
  deleteSecret(vaultRef: string): Promise<void>;
}

/* ── In-memory cache ────────────────────────────────────────── */

const payerCache = new Map<string, PersistedPayer>();
const tenantOverrideCache = new Map<string, TenantPayerOverride>(); // key: `${tenantId}:${payerId}`
let initialized = false;

/* ── Helpers ────────────────────────────────────────────────── */

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function hashRecord(record: PhHmo): string {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

function atomicWrite(path: string, data: unknown): void {
  // Phase 125: Block JSON file writes in rc/prod runtime modes
  if (blocksJsonStores()) {
    throw new Error(
      `JSON file writes are blocked in PLATFORM_RUNTIME_MODE=${getRuntimeMode()}. ` +
        `Use the PostgreSQL-backed payer repository (store-resolver) instead.`
    );
  }
  const tmpPath = path + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  // Rename is atomic on most filesystems
  renameSync(tmpPath, path);
}

/* ── Initialization (load from disk) ────────────────────────── */

export function initPayerPersistence(): { ok: boolean; count: number; error?: string } {
  if (initialized) return { ok: true, count: payerCache.size };

  ensureDir(DATA_DIR);

  // Load registry DB if exists
  if (existsSync(REGISTRY_DB_PATH)) {
    try {
      const raw = stripBom(readFileSync(REGISTRY_DB_PATH, 'utf-8'));
      const db: RegistryDbFile = JSON.parse(raw);
      for (const p of db.payers) {
        payerCache.set(p.payerId, p);
      }
    } catch (err) {
      initialized = true;
      return {
        ok: false,
        count: 0,
        error: `Failed to load registry DB: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // Load tenant overrides if exists
  if (existsSync(TENANT_OVERRIDES_PATH)) {
    try {
      const raw = stripBom(readFileSync(TENANT_OVERRIDES_PATH, 'utf-8'));
      const overrides: TenantOverridesFile = JSON.parse(raw);
      for (const o of overrides.overrides) {
        tenantOverrideCache.set(`${o.tenantId}:${o.payerId}`, o);
      }
    } catch {
      // Non-fatal: tenant overrides are optional
    }
  }

  initialized = true;
  return { ok: true, count: payerCache.size };
}

/* ── Flush to disk ──────────────────────────────────────────── */

function flushRegistryDb(): void {
  ensureDir(DATA_DIR);
  const db: RegistryDbFile = {
    _meta: {
      schema: 'payer-registry-db-v1',
      lastModified: new Date().toISOString(),
      payerCount: payerCache.size,
    },
    payers: Array.from(payerCache.values()).sort((a, b) => a.legalName.localeCompare(b.legalName)),
  };
  atomicWrite(REGISTRY_DB_PATH, db);
}

function flushTenantOverrides(): void {
  ensureDir(DATA_DIR);
  const file: TenantOverridesFile = {
    _meta: {
      schema: 'tenant-payer-overrides-v1',
      lastModified: new Date().toISOString(),
    },
    overrides: Array.from(tenantOverrideCache.values()),
  };
  atomicWrite(TENANT_OVERRIDES_PATH, file);
}

/* ── Import from snapshot JSON ──────────────────────────────── */

export function importFromSnapshot(params: {
  sourceType: PayerProvenance['sourceType'];
  sourceUrl?: string;
  importedBy: string;
}): { ok: boolean; imported: number; skipped: number; errors: string[] } {
  const snapshotPath = join(DATA_DIR, 'ph-hmo-registry.json');

  if (!existsSync(snapshotPath)) {
    return { ok: false, imported: 0, skipped: 0, errors: [`Snapshot not found: ${snapshotPath}`] };
  }

  const raw = stripBom(readFileSync(snapshotPath, 'utf-8'));
  let data: PhHmoRegistryData;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      errors: [`Parse error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const fileHash = createHash('sha256').update(raw).digest('hex');
  const now = new Date().toISOString();
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const hmo of data.hmos) {
    if (!hmo.payerId || !hmo.legalName) {
      errors.push(`Skipping entry: missing payerId or legalName`);
      skipped++;
      continue;
    }

    // Don't overwrite existing records (idempotent import)
    if (payerCache.has(hmo.payerId)) {
      skipped++;
      continue;
    }

    const persisted: PersistedPayer = {
      ...hmo,
      importedAt: now,
      updatedAt: now,
      importHash: hashRecord(hmo),
      provenance: {
        sourceType: params.sourceType,
        sourceUrl: params.sourceUrl ?? data._meta?.canonicalSource?.url,
        retrievedAt: data._meta?.canonicalSource?.retrievedAt ?? now,
        importedBy: params.importedBy,
        fileHash,
      },
    };

    payerCache.set(hmo.payerId, persisted);
    imported++;
  }

  // Also import PhilHealth as a special payer if not present
  if (!payerCache.has('PH-PHILHEALTH')) {
    const philhealth: PersistedPayer = {
      payerId: 'PH-PHILHEALTH',
      legalName: 'Philippine Health Insurance Corporation',
      brandNames: ['PhilHealth'],
      type: 'HMO',
      country: 'PH',
      canonicalSource: {
        url: 'https://www.philhealth.gov.ph/',
        asOfDate: '2025-12-31',
        retrievedAt: now,
      },
      capabilities: {
        loa: 'manual',
        eligibility: 'portal',
        claimsSubmission: 'portal',
        claimStatus: 'portal',
        remittance: 'manual',
        memberPortal: 'available',
        providerPortal: 'available',
      },
      integrationMode: 'portal',
      evidence: [
        {
          kind: 'provider_portal',
          url: 'https://www.philhealth.gov.ph/services/eclaims/',
          title: 'PhilHealth eClaims Portal',
          retrievedAt: now,
          notes:
            'Government insurance -- separate from HMO registry. eClaims v3 integration via Phase 90.',
        },
      ],
      status: 'active',
      contractingTasks: [],
      importedAt: now,
      updatedAt: now,
      importHash: hashRecord({
        payerId: 'PH-PHILHEALTH',
        legalName: 'Philippine Health Insurance Corporation',
        brandNames: ['PhilHealth'],
        type: 'HMO',
        country: 'PH',
        canonicalSource: {
          url: 'https://www.philhealth.gov.ph/',
          asOfDate: '2025-12-31',
          retrievedAt: now,
        },
        capabilities: {
          loa: 'manual',
          eligibility: 'portal',
          claimsSubmission: 'portal',
          claimStatus: 'portal',
          remittance: 'manual',
          memberPortal: 'available',
          providerPortal: 'available',
        },
        integrationMode: 'portal',
        evidence: [],
        status: 'active',
      }),
      provenance: {
        sourceType: 'manual_entry',
        sourceUrl: 'https://www.philhealth.gov.ph/',
        retrievedAt: now,
        importedBy: params.importedBy,
      },
    };
    payerCache.set('PH-PHILHEALTH', philhealth);
    imported++;
  }

  if (imported > 0) {
    flushRegistryDb();
  }

  return { ok: errors.length === 0, imported, skipped, errors };
}

/* ── CRUD operations ────────────────────────────────────────── */

export function getPayer(payerId: string): PersistedPayer | undefined {
  if (!initialized) initPayerPersistence();
  return payerCache.get(payerId);
}

export function listPayers(filter?: {
  status?: HmoStatus;
  integrationMode?: HmoIntegrationMode;
  search?: string;
  limit?: number;
  offset?: number;
}): { payers: PersistedPayer[]; total: number } {
  if (!initialized) initPayerPersistence();

  let result = Array.from(payerCache.values());

  if (filter?.status) {
    result = result.filter((p) => p.status === filter.status);
  }
  if (filter?.integrationMode) {
    result = result.filter((p) => p.integrationMode === filter.integrationMode);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter((p) => {
      const haystack = [p.legalName, p.payerId, ...p.brandNames].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  result.sort((a, b) => a.legalName.localeCompare(b.legalName));
  const total = result.length;
  const offset = filter?.offset ?? 0;
  const limit = filter?.limit ?? 200;

  return { payers: result.slice(offset, offset + limit), total };
}

export function updatePayerCapabilities(
  payerId: string,
  capabilities: Partial<HmoCapabilities>,
  actor: string,
  reason: string
): { ok: boolean; payer?: PersistedPayer; error?: string; before?: HmoCapabilities } {
  if (!initialized) initPayerPersistence();
  const payer = payerCache.get(payerId);
  if (!payer) return { ok: false, error: `Payer not found: ${payerId}` };

  const before = { ...payer.capabilities };
  const updated: PersistedPayer = {
    ...payer,
    capabilities: { ...payer.capabilities, ...capabilities },
    updatedAt: new Date().toISOString(),
  };

  payerCache.set(payerId, updated);
  flushRegistryDb();

  return { ok: true, payer: updated, before };
}

export function updatePayerTasks(
  payerId: string,
  tasks: string[],
  actor: string,
  reason: string
): { ok: boolean; payer?: PersistedPayer; error?: string; before?: string[] } {
  if (!initialized) initPayerPersistence();
  const payer = payerCache.get(payerId);
  if (!payer) return { ok: false, error: `Payer not found: ${payerId}` };

  const before = payer.contractingTasks ? [...payer.contractingTasks] : [];
  const updated: PersistedPayer = {
    ...payer,
    contractingTasks: tasks,
    updatedAt: new Date().toISOString(),
  };

  payerCache.set(payerId, updated);
  flushRegistryDb();

  return { ok: true, payer: updated, before };
}

export function updatePayerStatus(
  payerId: string,
  status: HmoStatus,
  actor: string,
  reason: string
): { ok: boolean; payer?: PersistedPayer; error?: string; before?: HmoStatus } {
  if (!initialized) initPayerPersistence();
  const payer = payerCache.get(payerId);
  if (!payer) return { ok: false, error: `Payer not found: ${payerId}` };

  const before = payer.status;
  const updated: PersistedPayer = {
    ...payer,
    status,
    updatedAt: new Date().toISOString(),
  };

  payerCache.set(payerId, updated);
  flushRegistryDb();

  return { ok: true, payer: updated, before };
}

export function addPayerEvidence(
  payerId: string,
  evidence: HmoEvidence,
  actor: string
): { ok: boolean; payer?: PersistedPayer; error?: string } {
  if (!initialized) initPayerPersistence();
  const payer = payerCache.get(payerId);
  if (!payer) return { ok: false, error: `Payer not found: ${payerId}` };

  const updated: PersistedPayer = {
    ...payer,
    evidence: [...payer.evidence, evidence],
    updatedAt: new Date().toISOString(),
  };

  payerCache.set(payerId, updated);
  flushRegistryDb();

  return { ok: true, payer: updated };
}

/* ── Tenant overrides ───────────────────────────────────────── */

export function getTenantOverride(
  tenantId: string,
  payerId: string
): TenantPayerOverride | undefined {
  if (!initialized) initPayerPersistence();
  return tenantOverrideCache.get(`${tenantId}:${payerId}`);
}

export function setTenantOverride(override: TenantPayerOverride): { ok: boolean } {
  if (!initialized) initPayerPersistence();
  tenantOverrideCache.set(`${override.tenantId}:${override.payerId}`, override);
  flushTenantOverrides();
  return { ok: true };
}

export function listTenantOverrides(tenantId: string): TenantPayerOverride[] {
  if (!initialized) initPayerPersistence();
  return Array.from(tenantOverrideCache.values()).filter((o) => o.tenantId === tenantId);
}

/** Resolve effective payer for a tenant (global + overrides merged) */
export function resolvePayerForTenant(
  tenantId: string,
  payerId: string
): PersistedPayer | undefined {
  if (!initialized) initPayerPersistence();
  const global = payerCache.get(payerId);
  if (!global) return undefined;

  const override = tenantOverrideCache.get(`${tenantId}:${payerId}`);
  if (!override) return global;

  return {
    ...global,
    capabilities: { ...global.capabilities, ...override.capabilityOverrides },
    status: override.statusOverride ?? global.status,
    integrationMode: override.integrationModeOverride ?? global.integrationMode,
    contractingTasks: override.contractingTasks ?? global.contractingTasks,
  };
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getPayerRegistryStats(): {
  total: number;
  byStatus: Record<string, number>;
  byIntegrationMode: Record<string, number>;
  withPortal: number;
  contractingNeeded: number;
  hasPhilHealth: boolean;
} {
  if (!initialized) initPayerPersistence();
  const all = Array.from(payerCache.values());
  const byStatus: Record<string, number> = {};
  const byIntegrationMode: Record<string, number> = {};
  let withPortal = 0;
  let contractingNeeded = 0;

  for (const p of all) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    byIntegrationMode[p.integrationMode] = (byIntegrationMode[p.integrationMode] ?? 0) + 1;
    if (p.capabilities.providerPortal === 'available' || p.capabilities.providerPortal === 'portal')
      withPortal++;
    if (p.status === 'contracting_needed') contractingNeeded++;
  }

  return {
    total: all.length,
    byStatus,
    byIntegrationMode,
    withPortal,
    contractingNeeded,
    hasPhilHealth: payerCache.has('PH-PHILHEALTH'),
  };
}

/** Check if persistence layer is initialized */
export function isPayerPersistenceReady(): boolean {
  return initialized;
}

/** Get the DB file path (for verification scripts) */
export function getRegistryDbPath(): string {
  return REGISTRY_DB_PATH;
}
