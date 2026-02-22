/**
 * Payer Registry Store — Phase 88: PH Payer Registry Ingestion
 *
 * Versioned, source-tracked payer registry with:
 *   - payer_registry_sources: ingestion source metadata + hashes
 *   - payers: canonical payer records with aliases, tier, type
 *   - payer_relationships: broker -> payer mappings
 *
 * In-memory stores (same pattern as imaging-worklist, payerops-store).
 * Migration plan:
 *   1. In-memory Map (current)
 *   2. SQLite (multi-instance)
 *   3. PostgreSQL (SaaS multi-tenant)
 */

import { randomBytes, createHash } from "node:crypto";

/* ── ID generation ──────────────────────────────────────────── */

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

/* ── Types ──────────────────────────────────────────────────── */

export type PayerSourceType = "ic_hmo_list" | "ic_hmo_broker_list" | "manual" | "csv_import";

export interface PayerRegistrySource {
  id: string;
  name: string;
  sourceType: PayerSourceType;
  url: string;
  asOfDate: string;           // date the source doc was published
  contentHash: string;        // SHA-256 of raw content
  fetchedAt: string;          // when we fetched it
  recordCount: number;
  version: number;            // increments on each ingest of same source type
  rawArtifactPath?: string;   // path under /artifacts/regulator/
}

export type RegistryPayerType = "hmo" | "hmo_broker" | "government" | "insurer" | "other";
export type PriorityTier = "top5" | "top10" | "long_tail" | "untiered";
export type RegistryPayerStatus = "active" | "inactive" | "suspended" | "pending_ca";

export interface RegistryPayer {
  id: string;
  canonicalName: string;
  aliases: string[];
  type: RegistryPayerType;
  regulatorRef?: string;       // e.g., license/CA number
  status: RegistryPayerStatus;
  country: string;
  priorityTier: PriorityTier;
  portalUrl?: string;
  portalInstructions?: string;
  sourceId: string;            // FK to PayerRegistrySource
  createdAt: string;
  updatedAt: string;
}

export interface PayerRelationship {
  id: string;
  brokerId: string;            // RegistryPayer.id (type=hmo_broker)
  payerId: string;             // RegistryPayer.id (type=hmo)
  relationship: "broker_for" | "partner" | "affiliate";
  notes?: string;
  createdAt: string;
}

export interface RegistryDiffEntry {
  payerName: string;
  change: "added" | "removed" | "renamed";
  oldName?: string;
  newName?: string;
}

export interface RegistrySnapshot {
  sourceId: string;
  sourceType: PayerSourceType;
  version: number;
  asOfDate: string;
  fetchedAt: string;
  payerCount: number;
  diff: RegistryDiffEntry[];
}

/* ── Stores ─────────────────────────────────────────────────── */

const sources = new Map<string, PayerRegistrySource>();
const payers = new Map<string, RegistryPayer>();
const relationships = new Map<string, PayerRelationship>();
const snapshots: RegistrySnapshot[] = [];

/* ── Source CRUD ─────────────────────────────────────────────── */

export function createSource(data: {
  name: string;
  sourceType: PayerSourceType;
  url: string;
  asOfDate: string;
  content: string; // raw content to hash
  recordCount: number;
  rawArtifactPath?: string;
}): PayerRegistrySource {
  const hash = createHash("sha256").update(data.content).digest("hex");

  // Check for duplicate hash — idempotent
  const existing = Array.from(sources.values()).find(
    s => s.sourceType === data.sourceType && s.contentHash === hash
  );
  if (existing) return existing;

  // Compute version for this source type
  const prevVersions = Array.from(sources.values())
    .filter(s => s.sourceType === data.sourceType)
    .map(s => s.version);
  const version = prevVersions.length > 0 ? Math.max(...prevVersions) + 1 : 1;

  const now = new Date().toISOString();
  const source: PayerRegistrySource = {
    id: newId("src"),
    name: data.name,
    sourceType: data.sourceType,
    url: data.url,
    asOfDate: data.asOfDate,
    contentHash: hash,
    fetchedAt: now,
    recordCount: data.recordCount,
    version,
    rawArtifactPath: data.rawArtifactPath,
  };
  sources.set(source.id, source);
  return source;
}

export function listSources(): PayerRegistrySource[] {
  return Array.from(sources.values())
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
}

export function getSource(id: string): PayerRegistrySource | undefined {
  return sources.get(id);
}

export function getLatestSourceByType(type: PayerSourceType): PayerRegistrySource | undefined {
  return Array.from(sources.values())
    .filter(s => s.sourceType === type)
    .sort((a, b) => b.version - a.version)[0];
}

/* ── Payer CRUD ──────────────────────────────────────────────── */

export function upsertRegistryPayer(data: {
  canonicalName: string;
  type: RegistryPayerType;
  regulatorRef?: string;
  status?: RegistryPayerStatus;
  country?: string;
  sourceId: string;
  aliases?: string[];
}): { payer: RegistryPayer; isNew: boolean } {
  // Match by canonical name (case-insensitive) or alias
  const normalizedName = data.canonicalName.trim().toLowerCase();
  let existing: RegistryPayer | undefined;

  for (const p of payers.values()) {
    if (p.canonicalName.toLowerCase() === normalizedName) {
      existing = p;
      break;
    }
    if (p.aliases.some(a => a.toLowerCase() === normalizedName)) {
      existing = p;
      break;
    }
  }

  if (existing) {
    // Update existing
    existing.regulatorRef = data.regulatorRef ?? existing.regulatorRef;
    existing.status = data.status ?? existing.status;
    existing.sourceId = data.sourceId;
    existing.updatedAt = new Date().toISOString();
    if (data.aliases) {
      const aliasSet = new Set([...existing.aliases, ...data.aliases]);
      existing.aliases = [...aliasSet];
    }
    return { payer: existing, isNew: false };
  }

  const now = new Date().toISOString();
  const payer: RegistryPayer = {
    id: newId("rp"),
    canonicalName: data.canonicalName.trim(),
    aliases: data.aliases ?? [],
    type: data.type,
    regulatorRef: data.regulatorRef,
    status: data.status ?? "active",
    country: data.country ?? "PH",
    priorityTier: "untiered",
    sourceId: data.sourceId,
    createdAt: now,
    updatedAt: now,
  };
  payers.set(payer.id, payer);
  return { payer, isNew: true };
}

export function getRegistryPayer(id: string): RegistryPayer | undefined {
  return payers.get(id);
}

export function listRegistryPayers(filter?: {
  type?: RegistryPayerType;
  status?: RegistryPayerStatus;
  country?: string;
  tier?: PriorityTier;
  search?: string;
}): RegistryPayer[] {
  let result = Array.from(payers.values());
  if (filter?.type) result = result.filter(p => p.type === filter.type);
  if (filter?.status) result = result.filter(p => p.status === filter.status);
  if (filter?.country) result = result.filter(p => p.country === filter.country);
  if (filter?.tier) result = result.filter(p => p.priorityTier === filter.tier);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(p =>
      p.canonicalName.toLowerCase().includes(q) ||
      p.aliases.some(a => a.toLowerCase().includes(q))
    );
  }
  return result.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
}

export function patchRegistryPayer(
  id: string,
  patch: Partial<Pick<RegistryPayer, "canonicalName" | "aliases" | "priorityTier" | "portalUrl" | "portalInstructions" | "status" | "type">>
): RegistryPayer | undefined {
  const payer = payers.get(id);
  if (!payer) return undefined;

  if (patch.canonicalName !== undefined) payer.canonicalName = patch.canonicalName.trim();
  if (patch.aliases !== undefined) payer.aliases = patch.aliases;
  if (patch.priorityTier !== undefined) payer.priorityTier = patch.priorityTier;
  if (patch.portalUrl !== undefined) payer.portalUrl = patch.portalUrl;
  if (patch.portalInstructions !== undefined) payer.portalInstructions = patch.portalInstructions;
  if (patch.status !== undefined) payer.status = patch.status;
  if (patch.type !== undefined) payer.type = patch.type;
  payer.updatedAt = new Date().toISOString();
  return payer;
}

/**
 * Merge duplicate payers: keep targetId, add alias from sourceId, remove sourceId.
 */
export function mergeRegistryPayers(
  targetId: string,
  sourceId: string,
): { ok: boolean; error?: string; merged?: RegistryPayer } {
  const target = payers.get(targetId);
  const source = payers.get(sourceId);
  if (!target) return { ok: false, error: "Target payer not found" };
  if (!source) return { ok: false, error: "Source payer not found" };
  if (targetId === sourceId) return { ok: false, error: "Cannot merge payer with itself" };

  // Move source name + aliases into target
  const aliasSet = new Set([...target.aliases, source.canonicalName, ...source.aliases]);
  aliasSet.delete(target.canonicalName); // don't alias self
  target.aliases = [...aliasSet];
  target.updatedAt = new Date().toISOString();

  // Transfer relationships
  for (const rel of relationships.values()) {
    if (rel.brokerId === sourceId) rel.brokerId = targetId;
    if (rel.payerId === sourceId) rel.payerId = targetId;
  }

  payers.delete(sourceId);
  return { ok: true, merged: target };
}

/* ── Relationships ───────────────────────────────────────────── */

export function addRelationship(data: {
  brokerId: string;
  payerId: string;
  relationship?: "broker_for" | "partner" | "affiliate";
  notes?: string;
}): PayerRelationship {
  // Idempotent: skip if same pair exists
  for (const rel of relationships.values()) {
    if (rel.brokerId === data.brokerId && rel.payerId === data.payerId) return rel;
  }
  const rel: PayerRelationship = {
    id: newId("rel"),
    brokerId: data.brokerId,
    payerId: data.payerId,
    relationship: data.relationship ?? "broker_for",
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };
  relationships.set(rel.id, rel);
  return rel;
}

export function listRelationships(filter?: {
  brokerId?: string;
  payerId?: string;
}): PayerRelationship[] {
  let result = Array.from(relationships.values());
  if (filter?.brokerId) result = result.filter(r => r.brokerId === filter.brokerId);
  if (filter?.payerId) result = result.filter(r => r.payerId === filter.payerId);
  return result;
}

/* ── Snapshots ───────────────────────────────────────────────── */

export function recordSnapshot(data: {
  sourceId: string;
  sourceType: PayerSourceType;
  version: number;
  asOfDate: string;
  fetchedAt: string;
  payerCount: number;
  diff: RegistryDiffEntry[];
}): void {
  snapshots.push(data);
}

export function listSnapshots(): RegistrySnapshot[] {
  return [...snapshots].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
}

export function getLatestSnapshot(sourceType: PayerSourceType): RegistrySnapshot | undefined {
  return snapshots
    .filter(s => s.sourceType === sourceType)
    .sort((a, b) => b.version - a.version)[0];
}

/* ── Stats ───────────────────────────────────────────────────── */

export function getRegistryStats(): {
  totalPayers: number;
  totalSources: number;
  totalRelationships: number;
  totalSnapshots: number;
  byType: Record<string, number>;
  byTier: Record<string, number>;
  byStatus: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const p of payers.values()) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    byTier[p.priorityTier] = (byTier[p.priorityTier] ?? 0) + 1;
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return {
    totalPayers: payers.size,
    totalSources: sources.size,
    totalRelationships: relationships.size,
    totalSnapshots: snapshots.length,
    byType,
    byTier,
    byStatus,
  };
}
