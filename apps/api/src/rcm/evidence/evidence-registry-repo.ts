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
import { getPgDb } from "../../platform/pg/pg-db.js";
import { integrationEvidence } from "../../platform/pg/pg-schema.js";

export type IntegrationEvidenceRow = typeof integrationEvidence.$inferSelect;

/* ── Queries ─────────────────────────────────────────── */

export async function findByIdForTenant(
  tenantId: string,
  id: string,
): Promise<IntegrationEvidenceRow | undefined> {
  const rows = await getPgDb()
    .select()
    .from(integrationEvidence)
    .where(and(eq(integrationEvidence.id, id), eq(integrationEvidence.tenantId, tenantId)));
  return rows[0] ?? undefined;
}

export async function listAll(tenantId: string): Promise<IntegrationEvidenceRow[]> {
  return await getPgDb()
    .select()
    .from(integrationEvidence)
    .where(eq(integrationEvidence.tenantId, tenantId))
    .orderBy(desc(integrationEvidence.updatedAt));
}

export async function listByPayer(
  tenantId: string,
  payerId: string,
): Promise<IntegrationEvidenceRow[]> {
  return await getPgDb()
    .select()
    .from(integrationEvidence)
    .where(and(eq(integrationEvidence.tenantId, tenantId), eq(integrationEvidence.payerId, payerId)))
    .orderBy(desc(integrationEvidence.updatedAt));
}

export async function listByStatus(
  tenantId: string,
  status: string,
): Promise<IntegrationEvidenceRow[]> {
  return await getPgDb()
    .select()
    .from(integrationEvidence)
    .where(and(eq(integrationEvidence.tenantId, tenantId), eq(integrationEvidence.status, status)))
    .orderBy(desc(integrationEvidence.updatedAt));
}

export async function listByMethod(
  tenantId: string,
  method: string,
): Promise<IntegrationEvidenceRow[]> {
  return await getPgDb()
    .select()
    .from(integrationEvidence)
    .where(and(eq(integrationEvidence.tenantId, tenantId), eq(integrationEvidence.method, method)))
    .orderBy(desc(integrationEvidence.updatedAt));
}

/**
 * Find evidence for a specific payer + method combination.
 */
export async function findByPayerAndMethod(
  tenantId: string,
  payerId: string,
  method: string,
): Promise<IntegrationEvidenceRow | undefined> {
  const rows = await getPgDb()
    .select()
    .from(integrationEvidence)
    .where(
      and(
        eq(integrationEvidence.tenantId, tenantId),
        eq(integrationEvidence.payerId, payerId),
        eq(integrationEvidence.method, method),
      ),
    );
  return rows[0] ?? undefined;
}

/* ── Mutations ───────────────────────────────────────── */

export interface CreateEvidenceInput {
  tenantId: string;
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

export async function insertEvidence(data: CreateEvidenceInput): Promise<IntegrationEvidenceRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(integrationEvidence)
    .values({
      id,
      tenantId: data.tenantId,
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
    });

  return (await findByIdForTenant(data.tenantId, id))!;
}

export async function updateEvidence(
  tenantId: string,
  id: string,
  data: Partial<Omit<CreateEvidenceInput, "payerId">>,
): Promise<IntegrationEvidenceRow | undefined> {
  const existing = await findByIdForTenant(tenantId, id);
  if (!existing) return undefined;

  const now = new Date().toISOString();

  await getPgDb()
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
    .where(and(eq(integrationEvidence.id, id), eq(integrationEvidence.tenantId, tenantId)));

  return await findByIdForTenant(tenantId, id);
}

/**
 * Soft-delete: set status to 'archived'.
 */
export async function archiveEvidence(tenantId: string, id: string): Promise<boolean> {
  const existing = await findByIdForTenant(tenantId, id);
  if (!existing) return false;

  const now = new Date().toISOString();
  await getPgDb()
    .update(integrationEvidence)
    .set({ status: "archived", updatedAt: now })
    .where(and(eq(integrationEvidence.id, id), eq(integrationEvidence.tenantId, tenantId)));

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
export async function getEvidenceStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
}> {
  const all = await listAll(tenantId);
  const byStatus: Record<string, number> = {};
  const byMethod: Record<string, number> = {};

  for (const row of all) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    byMethod[row.method] = (byMethod[row.method] ?? 0) + 1;
  }

  return { total: all.length, byStatus, byMethod };
}
