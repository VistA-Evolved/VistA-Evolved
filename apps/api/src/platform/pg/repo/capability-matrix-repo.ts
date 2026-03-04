/**
 * Capability Matrix Repository (PostgreSQL)
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Replaces the in-memory Map<string, PayerCapability> store in
 * rcm/payerOps/capability-matrix.ts with durable Postgres storage.
 *
 * Uses the new capabilityMatrixCell + capabilityMatrixEvidence tables
 * added in pg-migrate v5.
 *
 * Types are re-exported from the in-memory module so callers don't
 * need to change their imports for type definitions.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { capabilityMatrixCell, capabilityMatrixEvidence, payerAuditEvent } from '../pg-schema.js';

/* ----------------------------------------------------------------
 *  Types (aligned with rcm/payerOps/capability-matrix.ts)
 * ---------------------------------------------------------------- */

export type CapabilityType =
  | 'eligibility'
  | 'loa'
  | 'claims_submit'
  | 'claim_status'
  | 'remittance';

export type CapabilityMode = 'manual' | 'portal' | 'api' | 'rpa_planned';

export type CapabilityMaturity = 'none' | 'planned' | 'in_progress' | 'active';

export interface CapabilityEvidence {
  id: string;
  type: 'url' | 'internal_note' | 'runbook_ref';
  value: string;
  addedBy: string;
  addedAt: string;
}

export interface PayerCapability {
  payerId: string;
  payerName: string;
  capability: CapabilityType;
  mode: CapabilityMode;
  maturity: CapabilityMaturity;
  evidence: CapabilityEvidence[];
  operationalNotes?: string;
  updatedBy: string;
  updatedAt: string;
}

export type CellRow = typeof capabilityMatrixCell.$inferSelect;
export type EvidenceRow = typeof capabilityMatrixEvidence.$inferSelect;

/* ----------------------------------------------------------------
 *  Core CRUD
 * ---------------------------------------------------------------- */

/**
 * Get a single capability cell with its evidence.
 */
export async function getCapability(
  payerId: string,
  capability: CapabilityType
): Promise<PayerCapability | undefined> {
  const db = getPgDb();
  const cells = await db
    .select()
    .from(capabilityMatrixCell)
    .where(
      and(
        eq(capabilityMatrixCell.payerId, payerId),
        eq(capabilityMatrixCell.capability, capability)
      )
    );
  const cell = cells[0];
  if (!cell) return undefined;

  const evidence = await db
    .select()
    .from(capabilityMatrixEvidence)
    .where(eq(capabilityMatrixEvidence.cellId, cell.id));

  return cellToPayerCapability(cell, evidence);
}

/**
 * Get all capabilities for a payer.
 */
export async function getPayerCapabilities(payerId: string): Promise<PayerCapability[]> {
  const db = getPgDb();
  const cells = await db
    .select()
    .from(capabilityMatrixCell)
    .where(eq(capabilityMatrixCell.payerId, payerId));

  const results: PayerCapability[] = [];
  for (const cell of cells) {
    const evidence = await db
      .select()
      .from(capabilityMatrixEvidence)
      .where(eq(capabilityMatrixEvidence.cellId, cell.id));
    results.push(cellToPayerCapability(cell, evidence));
  }
  return results;
}

/**
 * Get the entire capability matrix.
 */
export async function getFullMatrix(): Promise<PayerCapability[]> {
  const db = getPgDb();
  const cells = await db
    .select()
    .from(capabilityMatrixCell)
    .orderBy(capabilityMatrixCell.payerId, capabilityMatrixCell.capability);

  const results: PayerCapability[] = [];
  for (const cell of cells) {
    const evidence = await db
      .select()
      .from(capabilityMatrixEvidence)
      .where(eq(capabilityMatrixEvidence.cellId, cell.id));
    results.push(cellToPayerCapability(cell, evidence));
  }
  return results;
}

/**
 * Create or update a capability cell.
 */
export async function setCapability(
  payerId: string,
  payerName: string,
  capability: CapabilityType,
  mode: CapabilityMode,
  maturity: CapabilityMaturity,
  updatedBy: string,
  operationalNotes?: string,
  tenantId?: string
): Promise<PayerCapability> {
  const db = getPgDb();
  const now = new Date().toISOString();

  // Maturity validation: "active" requires evidence (checked after upsert)
  const cells = await db
    .select()
    .from(capabilityMatrixCell)
    .where(
      and(
        eq(capabilityMatrixCell.payerId, payerId),
        eq(capabilityMatrixCell.capability, capability)
      )
    );
  const existing = cells[0];

  if (existing) {
    // If trying to set "active", check evidence exists
    if (maturity === 'active') {
      const evCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(capabilityMatrixEvidence)
        .where(eq(capabilityMatrixEvidence.cellId, existing.id));
      if ((evCount[0]?.count ?? 0) === 0) {
        maturity = 'in_progress';
      }
    }

    await db
      .update(capabilityMatrixCell)
      .set({
        payerName,
        mode,
        maturity,
        operationalNotes: operationalNotes ?? existing.operationalNotes,
        updatedBy,
        updatedAt: new Date(now),
      } as any)
      .where(eq(capabilityMatrixCell.id, existing.id));

    // Audit
    await db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId: tenantId ?? 'default',
      actorType: 'user',
      actorId: updatedBy,
      entityType: 'capability_matrix_cell',
      entityId: existing.id,
      action: 'update',
      beforeJson: JSON.parse(JSON.stringify(existing)),
      afterJson: { payerId, capability, mode, maturity },
      reason: `Updated ${capability} for ${payerName}`,
      evidenceSnapshotId: null,
      createdAt: new Date(now),
    });
  } else {
    const id = randomUUID();
    // New cell: if maturity="active" but no evidence yet, auto-downgrade
    if (maturity === 'active') {
      maturity = 'in_progress';
    }

    await db.insert(capabilityMatrixCell).values({
      id,
      tenantId: tenantId ?? 'default',
      payerId,
      payerName,
      capability,
      mode,
      maturity,
      operationalNotes: operationalNotes ?? null,
      updatedBy,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    // Audit
    await db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId: tenantId ?? 'default',
      actorType: 'user',
      actorId: updatedBy,
      entityType: 'capability_matrix_cell',
      entityId: id,
      action: 'create',
      beforeJson: null,
      afterJson: { payerId, capability, mode, maturity },
      reason: `Created ${capability} for ${payerName}`,
      evidenceSnapshotId: null,
      createdAt: new Date(now),
    });
  }

  return (await getCapability(payerId, capability))!;
}

/**
 * Add evidence to a capability cell.
 */
export async function addEvidence(
  payerId: string,
  capability: CapabilityType,
  evidence: { type: 'url' | 'internal_note' | 'runbook_ref'; value: string },
  addedBy: string,
  tenantId?: string
): Promise<PayerCapability | undefined> {
  const db = getPgDb();
  const cells = await db
    .select()
    .from(capabilityMatrixCell)
    .where(
      and(
        eq(capabilityMatrixCell.payerId, payerId),
        eq(capabilityMatrixCell.capability, capability)
      )
    );
  const cell = cells[0];
  if (!cell) return undefined;

  const now = new Date().toISOString();
  const evId = randomUUID();

  await db.insert(capabilityMatrixEvidence).values({
    id: evId,
    tenantId: tenantId ?? cell.tenantId,
    cellId: cell.id,
    evidenceType: evidence.type,
    value: evidence.value,
    addedBy,
    addedAt: new Date(now),
  });

  return getCapability(payerId, capability);
}

/**
 * Remove evidence from a capability cell.
 * If last evidence removed and maturity is "active", auto-demote to "in_progress".
 */
export async function removeEvidence(
  payerId: string,
  capability: CapabilityType,
  evidenceId: string
): Promise<PayerCapability | undefined> {
  const db = getPgDb();
  const cells = await db
    .select()
    .from(capabilityMatrixCell)
    .where(
      and(
        eq(capabilityMatrixCell.payerId, payerId),
        eq(capabilityMatrixCell.capability, capability)
      )
    );
  const cell = cells[0];
  if (!cell) return undefined;

  // Delete the evidence row
  await db
    .delete(capabilityMatrixEvidence)
    .where(
      and(eq(capabilityMatrixEvidence.id, evidenceId), eq(capabilityMatrixEvidence.cellId, cell.id))
    );

  // Check remaining evidence count
  const evCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(capabilityMatrixEvidence)
    .where(eq(capabilityMatrixEvidence.cellId, cell.id));

  if ((evCount[0]?.count ?? 0) === 0 && cell.maturity === 'active') {
    await db
      .update(capabilityMatrixCell)
      .set({ maturity: 'in_progress', updatedAt: new Date() } as any)
      .where(eq(capabilityMatrixCell.id, cell.id));
  }

  return getCapability(payerId, capability);
}

/**
 * Initialize default capability rows for a payer (all 5 types, mode=manual, maturity=none).
 */
export async function initPayerCapabilities(
  payerId: string,
  payerName: string,
  updatedBy: string,
  tenantId?: string
): Promise<PayerCapability[]> {
  const types: CapabilityType[] = [
    'eligibility',
    'loa',
    'claims_submit',
    'claim_status',
    'remittance',
  ];
  const results: PayerCapability[] = [];
  for (const cap of types) {
    const existing = await getCapability(payerId, cap);
    if (!existing) {
      const created = await setCapability(
        payerId,
        payerName,
        cap,
        'manual',
        'none',
        updatedBy,
        undefined,
        tenantId
      );
      results.push(created);
    } else {
      results.push(existing);
    }
  }
  return results;
}

/**
 * Get overall matrix statistics.
 */
export async function getMatrixStats(): Promise<{
  totalCells: number;
  byMaturity: Record<string, number>;
  byMode: Record<string, number>;
  payerCount: number;
}> {
  const db = getPgDb();

  const total = await db.select({ count: sql<number>`count(*)::int` }).from(capabilityMatrixCell);

  const maturityRows = await db
    .select({
      maturity: capabilityMatrixCell.maturity,
      count: sql<number>`count(*)::int`,
    })
    .from(capabilityMatrixCell)
    .groupBy(capabilityMatrixCell.maturity);

  const byMaturity: Record<string, number> = {};
  for (const r of maturityRows) byMaturity[r.maturity] = r.count;

  const modeRows = await db
    .select({
      mode: capabilityMatrixCell.mode,
      count: sql<number>`count(*)::int`,
    })
    .from(capabilityMatrixCell)
    .groupBy(capabilityMatrixCell.mode);

  const byMode: Record<string, number> = {};
  for (const r of modeRows) byMode[r.mode] = r.count;

  const payerCountRows = await db
    .select({ count: sql<number>`count(distinct payer_id)::int` })
    .from(capabilityMatrixCell);

  return {
    totalCells: total[0]?.count ?? 0,
    byMaturity,
    byMode,
    payerCount: payerCountRows[0]?.count ?? 0,
  };
}

/* ----------------------------------------------------------------
 *  Internal helpers
 * ---------------------------------------------------------------- */

function cellToPayerCapability(cell: CellRow, evidenceRows: EvidenceRow[]): PayerCapability {
  return {
    payerId: cell.payerId,
    payerName: cell.payerName,
    capability: cell.capability as CapabilityType,
    mode: cell.mode as CapabilityMode,
    maturity: cell.maturity as CapabilityMaturity,
    evidence: evidenceRows.map((e) => ({
      id: e.id,
      type: e.evidenceType as 'url' | 'internal_note' | 'runbook_ref',
      value: e.value,
      addedBy: e.addedBy,
      addedAt: typeof e.addedAt === 'string' ? e.addedAt : e.addedAt.toISOString(),
    })),
    operationalNotes: cell.operationalNotes ?? undefined,
    updatedBy: cell.updatedBy,
    updatedAt: typeof cell.updatedAt === 'string' ? cell.updatedAt : cell.updatedAt.toISOString(),
  };
}
