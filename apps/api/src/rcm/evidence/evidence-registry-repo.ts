/**
 * Integration Evidence Registry — per-payer evidence CRUD
 *
 * Phase 112: Evidence Pipeline + No-Fake-Integrations Gate
 *
 * Each row proves that a payer's claimed integration method (api, portal, edi, fhir, manual)
 * is backed by a verifiable source (URL, document, screenshot, contact confirmation).
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../platform/db/db.js";
import { integrationEvidence } from "../../platform/db/schema.js";

export type IntegrationEvidenceRow = typeof integrationEvidence.$inferSelect;

/* ── Queries ─────────────────────────────────────────── */

export function findById(id: string): IntegrationEvidenceRow | undefined {
  return getDb()
    .select()
    .from(integrationEvidence)
    .where(eq(integrationEvidence.id, id))
    .get();
}

export function listAll(tenantId?: string): IntegrationEvidenceRow[] {
  const db = getDb();
  if (tenantId) {
    return db
      .select()
      .from(integrationEvidence)
      .where(eq(integrationEvidence.tenantId, tenantId))
      .orderBy(desc(integrationEvidence.updatedAt))
      .all();
  }
  return db
    .select()
    .from(integrationEvidence)
    .orderBy(desc(integrationEvidence.updatedAt))
    .all();
}

export function listByPayer(payerId: string): IntegrationEvidenceRow[] {
  return getDb()
    .select()
    .from(integrationEvidence)
    .where(eq(integrationEvidence.payerId, payerId))
    .orderBy(desc(integrationEvidence.updatedAt))
    .all();
}

export function listByStatus(status: string): IntegrationEvidenceRow[] {
  return getDb()
    .select()
    .from(integrationEvidence)
    .where(eq(integrationEvidence.status, status))
    .orderBy(desc(integrationEvidence.updatedAt))
    .all();
}

export function listByMethod(method: string): IntegrationEvidenceRow[] {
  return getDb()
    .select()
    .from(integrationEvidence)
    .where(eq(integrationEvidence.method, method))
    .orderBy(desc(integrationEvidence.updatedAt))
    .all();
}

/**
 * Find evidence for a specific payer + method combination.
 */
export function findByPayerAndMethod(
  payerId: string,
  method: string,
): IntegrationEvidenceRow | undefined {
  return getDb()
    .select()
    .from(integrationEvidence)
    .where(
      and(
        eq(integrationEvidence.payerId, payerId),
        eq(integrationEvidence.method, method),
      ),
    )
    .get();
}

/* ── Mutations ───────────────────────────────────────── */

export interface CreateEvidenceInput {
  tenantId?: string;
  payerId: string;
  method: string;
  channel?: string;
  source: string;
  sourceType?: string;
  contactInfo?: string;
  submissionRequirements?: string;
  supportedChannelsJson?: string;
  lastVerifiedAt?: string;
  verifiedBy?: string;
  status?: string;
  confidence?: string;
  notes?: string;
}

export function insertEvidence(data: CreateEvidenceInput): IntegrationEvidenceRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.insert(integrationEvidence)
    .values({
      id,
      tenantId: data.tenantId ?? "default",
      payerId: data.payerId,
      method: data.method,
      channel: data.channel ?? null,
      source: data.source,
      sourceType: data.sourceType ?? "url",
      contactInfo: data.contactInfo ?? null,
      submissionRequirements: data.submissionRequirements ?? null,
      supportedChannelsJson: data.supportedChannelsJson ?? "[]",
      lastVerifiedAt: data.lastVerifiedAt ?? null,
      verifiedBy: data.verifiedBy ?? null,
      status: data.status ?? "unverified",
      confidence: data.confidence ?? "unknown",
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return findById(id)!;
}

export function updateEvidence(
  id: string,
  data: Partial<Omit<CreateEvidenceInput, "payerId">>,
): IntegrationEvidenceRow | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();

  getDb()
    .update(integrationEvidence)
    .set({
      ...(data.method !== undefined && { method: data.method }),
      ...(data.channel !== undefined && { channel: data.channel }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.sourceType !== undefined && { sourceType: data.sourceType }),
      ...(data.contactInfo !== undefined && { contactInfo: data.contactInfo }),
      ...(data.submissionRequirements !== undefined && {
        submissionRequirements: data.submissionRequirements,
      }),
      ...(data.supportedChannelsJson !== undefined && {
        supportedChannelsJson: data.supportedChannelsJson,
      }),
      ...(data.lastVerifiedAt !== undefined && {
        lastVerifiedAt: data.lastVerifiedAt,
      }),
      ...(data.verifiedBy !== undefined && { verifiedBy: data.verifiedBy }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.confidence !== undefined && { confidence: data.confidence }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: now,
    })
    .where(eq(integrationEvidence.id, id))
    .run();

  return findById(id);
}

/**
 * Soft-delete: set status to 'archived'.
 */
export function archiveEvidence(id: string): boolean {
  const existing = findById(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  getDb()
    .update(integrationEvidence)
    .set({ status: "archived", updatedAt: now })
    .where(eq(integrationEvidence.id, id))
    .run();

  return true;
}

/* ── Analytics ───────────────────────────────────────── */

export interface EvidenceCoverage {
  payerId: string;
  payerName?: string;
  integrationMode: string;
  evidenceCount: number;
  hasVerified: boolean;
  methods: string[];
}

/**
 * Count evidence entries by status.
 */
export function getEvidenceStats(): {
  total: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
} {
  const all = listAll();
  const byStatus: Record<string, number> = {};
  const byMethod: Record<string, number> = {};

  for (const row of all) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byMethod[row.method] = (byMethod[row.method] ?? 0) + 1;
  }

  return { total: all.length, byStatus, byMethod };
}
