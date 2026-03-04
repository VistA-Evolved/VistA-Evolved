/**
 * Payer Directory — Normalization Pipeline + Diff Engine
 *
 * Phase 44: rawSource -> normalizedPayers.json -> runtime registry cache
 *
 * The pipeline:
 * 1. Importers produce ImportResult[] (raw from authoritative sources)
 * 2. Normalization merges, deduplicates, and validates
 * 3. Diff engine compares against current registry
 * 4. Changes are applied to the runtime registry
 * 5. Audit trail records every change
 */

import type {
  DirectoryPayer,
  ImportResult,
  DirectoryDiffResult,
  PayerDiffEntry,
  EnrollmentPacket,
} from './types.js';
import type { Payer, PayerCountry } from '../domain/payer.js';
import { upsertPayer } from '../payer-registry/registry.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';

/* ── In-memory Directory Store ──────────────────────────────── */

const directoryStore = new Map<string, DirectoryPayer>();
const enrollmentStore = new Map<string, EnrollmentPacket>();

/* Phase 146: DB repo wiring */
let directoryDbRepo: { upsert(d: any): Promise<any> } | null = null;
export function initDirectoryStoreRepo(repo: typeof directoryDbRepo): void {
  directoryDbRepo = repo;
}
const refreshHistory: Array<{
  importerId: string;
  timestamp: string;
  diff: DirectoryDiffResult;
}> = [];

/* ── Normalization ──────────────────────────────────────────── */

/**
 * Normalize raw import results into canonical DirectoryPayer entries.
 * Deduplicates by payerId, merges channels from multiple importers.
 */
export function normalizeImportResults(results: ImportResult[]): DirectoryPayer[] {
  const merged = new Map<string, DirectoryPayer>();

  for (const result of results) {
    for (const payer of result.payers) {
      const existing = merged.get(payer.payerId);
      if (existing) {
        // Merge channels (deduplicate by type+connectorId)
        const channelKeys = new Set(
          existing.channels.map((c) => `${c.type}:${c.connectorId ?? ''}`)
        );
        for (const ch of payer.channels) {
          const key = `${ch.type}:${ch.connectorId ?? ''}`;
          if (!channelKeys.has(key)) {
            existing.channels.push(ch);
            channelKeys.add(key);
          }
        }
        // Merge supported transactions
        const txSet = new Set(existing.supportedTransactions);
        for (const tx of payer.supportedTransactions) txSet.add(tx);
        existing.supportedTransactions = [...txSet];
        // Update refresh timestamp
        existing.lastRefreshedAt = result.importedAt;
        existing.updatedAt = result.importedAt;
      } else {
        merged.set(payer.payerId, { ...payer, lastRefreshedAt: result.importedAt });
      }
    }
  }

  return Array.from(merged.values());
}

/* ── Diff Engine ────────────────────────────────────────────── */

/**
 * Compare new payer set against current directory store.
 * Returns added/removed/modified entries.
 */
export function computeDiff(
  importerId: string,
  newPayers: DirectoryPayer[],
  currentPayers?: DirectoryPayer[]
): DirectoryDiffResult {
  const current = currentPayers ?? Array.from(directoryStore.values());
  const currentMap = new Map(current.map((p) => [p.payerId, p]));
  const newMap = new Map(newPayers.map((p) => [p.payerId, p]));

  const added: PayerDiffEntry[] = [];
  const removed: PayerDiffEntry[] = [];
  const modified: PayerDiffEntry[] = [];
  let unchanged = 0;

  // Find added and modified
  for (const [id, newP] of newMap) {
    const oldP = currentMap.get(id);
    if (!oldP) {
      added.push({ payerId: id, displayName: newP.displayName, change: 'added' });
    } else {
      const changedFields = diffFields(oldP, newP);
      if (changedFields.length > 0) {
        modified.push({
          payerId: id,
          displayName: newP.displayName,
          change: 'modified',
          fields: changedFields,
        });
      } else {
        unchanged++;
      }
    }
  }

  // Find removed
  for (const [id, oldP] of currentMap) {
    if (!newMap.has(id)) {
      removed.push({ payerId: id, displayName: oldP.displayName, change: 'removed' });
    }
  }

  return {
    importerId,
    timestamp: new Date().toISOString(),
    added,
    removed,
    modified,
    unchanged,
  };
}

function diffFields(a: DirectoryPayer, b: DirectoryPayer): string[] {
  const fields: string[] = [];
  if (a.displayName !== b.displayName) fields.push('displayName');
  if (a.status !== b.status) fields.push('status');
  if (a.integrationMode !== b.integrationMode) fields.push('integrationMode');
  if (a.payerType !== b.payerType) fields.push('payerType');
  if (a.channels.length !== b.channels.length) fields.push('channels');
  if (a.supportedTransactions.length !== b.supportedTransactions.length)
    fields.push('supportedTransactions');
  if (a.category !== b.category) fields.push('category');
  if (a.parentOrg !== b.parentOrg) fields.push('parentOrg');
  if (JSON.stringify(a.payerIdsByNetwork) !== JSON.stringify(b.payerIdsByNetwork))
    fields.push('payerIdsByNetwork');
  return fields;
}

/* ── Apply to Registry ──────────────────────────────────────── */

/**
 * Apply normalized directory payers to the runtime payer registry.
 * Converts DirectoryPayer -> Payer and upserts.
 */
export function applyDirectoryToRegistry(payers: DirectoryPayer[]): number {
  let count = 0;
  for (const dp of payers) {
    const payer: Payer = directoryPayerToRegistryPayer(dp);
    upsertPayer(payer);
    directoryStore.set(dp.payerId, dp);

    // Phase 146: Write-through to PG
    directoryDbRepo
      ?.upsert({
        id: dp.payerId,
        tenantId: 'default',
        payerId: dp.payerId,
        field: 'directory',
        value: JSON.stringify(dp),
        source: 'import',
        createdAt: new Date().toISOString(),
      })
      .catch(() => {});

    count++;
  }
  return count;
}

function directoryPayerToRegistryPayer(dp: DirectoryPayer): Payer {
  return {
    payerId: dp.payerId,
    name: dp.displayName,
    country: dp.country,
    integrationMode: dp.integrationMode,
    status: dp.status,
    clearinghousePayerId:
      dp.payerIdsByNetwork.availityPayerId ??
      dp.payerIdsByNetwork.officeAllyPayerId ??
      dp.payerIdsByNetwork.stediPayerId,
    naic: dp.payerIdsByNetwork.naicCode,
    philhealthCode: dp.payerIdsByNetwork.philhealthCode,
    endpoints: dp.channels.map((ch) => ({
      purpose: 'claims' as const,
      protocol: channelToProtocol(ch.type),
      url: ch.endpoint,
      receiverId: ch.receiverId,
      notes: ch.notes,
    })),
    enrollmentRequired: true,
    category: dp.category,
    parentOrg: dp.parentOrg,
    aliases: dp.aliases,
    createdAt: dp.createdAt,
    updatedAt: dp.updatedAt,
  };
}

function channelToProtocol(type: string): 'edi_sftp' | 'edi_https' | 'soap' | 'rest' | 'portal' {
  switch (type) {
    case 'EDI_CLEARINGHOUSE':
      return 'edi_https';
    case 'DIRECT_API':
      return 'rest';
    case 'NATIONAL_GATEWAY':
      return 'rest';
    case 'FHIR_R4':
      return 'rest';
    case 'PORTAL_BATCH':
      return 'portal';
    default:
      return 'portal';
  }
}

/* ── Full Refresh Pipeline ──────────────────────────────────── */

/**
 * Run a full directory refresh:
 * 1. Run all importers
 * 2. Normalize results
 * 3. Compute diff
 * 4. Apply to registry
 * 5. Audit the refresh
 */
export function runDirectoryRefresh(
  results: ImportResult[],
  userId: string
): {
  normalized: DirectoryPayer[];
  diff: DirectoryDiffResult;
  applied: number;
} {
  const normalized = normalizeImportResults(results);
  const diff = computeDiff('full-refresh', normalized);
  const applied = applyDirectoryToRegistry(normalized);

  refreshHistory.push({
    importerId: 'full-refresh',
    timestamp: new Date().toISOString(),
    diff,
  });

  appendRcmAudit('directory.refreshed', {
    detail: {
      added: diff.added.length,
      removed: diff.removed.length,
      modified: diff.modified.length,
      unchanged: diff.unchanged,
      totalApplied: applied,
      userId,
    },
  });

  return { normalized, diff, applied };
}

/* ── Directory Queries ──────────────────────────────────────── */

export function getDirectoryPayer(payerId: string): DirectoryPayer | undefined {
  return directoryStore.get(payerId);
}

export function listDirectoryPayers(filter?: {
  country?: PayerCountry;
  payerType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { payers: DirectoryPayer[]; total: number } {
  let result = Array.from(directoryStore.values());

  if (filter?.country) result = result.filter((p) => p.country === filter.country);
  if (filter?.payerType) result = result.filter((p) => p.payerType === filter.payerType);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter((p) => {
      const haystack = [p.displayName, p.payerId, ...(p.aliases ?? [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  result.sort((a, b) => a.displayName.localeCompare(b.displayName));
  const total = result.length;
  const offset = filter?.offset ?? 0;
  const limit = filter?.limit ?? 200;

  return { payers: result.slice(offset, offset + limit), total };
}

export function getDirectoryStats(): {
  total: number;
  byCountry: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  lastRefreshedAt?: string;
} {
  const byCountry: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let lastRefresh: string | undefined;

  for (const p of directoryStore.values()) {
    byCountry[p.country] = (byCountry[p.country] ?? 0) + 1;
    byType[p.payerType] = (byType[p.payerType] ?? 0) + 1;
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    if (p.lastRefreshedAt && (!lastRefresh || p.lastRefreshedAt > lastRefresh)) {
      lastRefresh = p.lastRefreshedAt;
    }
  }

  return { total: directoryStore.size, byCountry, byType, byStatus, lastRefreshedAt: lastRefresh };
}

export function getRefreshHistory(): typeof refreshHistory {
  return [...refreshHistory];
}

/* ── Enrollment Store ───────────────────────────────────────── */

export function getEnrollmentPacket(payerId: string): EnrollmentPacket | undefined {
  return enrollmentStore.get(payerId);
}

export function upsertEnrollmentPacket(packet: EnrollmentPacket): void {
  packet.updatedAt = new Date().toISOString();
  enrollmentStore.set(packet.payerId, packet);
}

export function listEnrollmentPackets(filter?: {
  status?: string;
  limit?: number;
  offset?: number;
}): { packets: EnrollmentPacket[]; total: number } {
  let result = Array.from(enrollmentStore.values());

  if (filter?.status) result = result.filter((p) => p.enrollmentStatus === filter.status);

  const total = result.length;
  const offset = filter?.offset ?? 0;
  const limit = filter?.limit ?? 100;

  return { packets: result.slice(offset, offset + limit), total };
}

/* ── Reset (for tests) ──────────────────────────────────────── */

export function resetDirectoryStore(): void {
  directoryStore.clear();
  enrollmentStore.clear();
  refreshHistory.length = 0;
}
