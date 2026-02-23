/**
 * Tenant Payer Repository — tenant-scoped payer config
 *
 * Phase 95B: Platform Persistence Unification
 */

import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db.js";
import { tenantPayer, payerAuditEvent } from "../schema.js";

export type TenantPayerRow = typeof tenantPayer.$inferSelect;
export type TenantPayerInsert = typeof tenantPayer.$inferInsert;

export function findTenantPayer(tenantId: string, payerId: string): TenantPayerRow | undefined {
  const db = getDb();
  return db.select().from(tenantPayer)
    .where(and(eq(tenantPayer.tenantId, tenantId), eq(tenantPayer.payerId, payerId)))
    .get();
}

export function listTenantPayers(tenantId: string): TenantPayerRow[] {
  const db = getDb();
  return db.select().from(tenantPayer)
    .where(eq(tenantPayer.tenantId, tenantId))
    .all();
}

export function upsertTenantPayer(
  data: { tenantId: string; payerId: string; status?: string; notes?: string; vaultRef?: string },
  reason: string,
  actor?: string,
): TenantPayerRow {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = findTenantPayer(data.tenantId, data.payerId);

  if (existing) {
    // Update
    db.update(tenantPayer).set({
      status: data.status ?? existing.status,
      notes: data.notes ?? existing.notes,
      vaultRef: data.vaultRef ?? existing.vaultRef,
      updatedAt: now,
    } as any).where(eq(tenantPayer.id, existing.id)).run();

    const after = findTenantPayer(data.tenantId, data.payerId)!;

    db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId: data.tenantId,
      actorType: actor ? "user" : "system",
      actorId: actor ?? null,
      entityType: "tenant_payer",
      entityId: existing.id,
      action: "update",
      beforeJson: JSON.stringify(existing),
      afterJson: JSON.stringify(after),
      reason,
      evidenceSnapshotId: null,
      createdAt: now,
    }).run();

    return after;
  } else {
    // Insert
    const id = randomUUID();
    db.insert(tenantPayer).values({
      id,
      tenantId: data.tenantId,
      payerId: data.payerId,
      status: data.status ?? "contracting_needed",
      notes: data.notes ?? null,
      vaultRef: data.vaultRef ?? null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = findTenantPayer(data.tenantId, data.payerId)!;

    db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId: data.tenantId,
      actorType: actor ? "user" : "system",
      actorId: actor ?? null,
      entityType: "tenant_payer",
      entityId: id,
      action: "create",
      beforeJson: null,
      afterJson: JSON.stringify(created),
      reason,
      evidenceSnapshotId: null,
      createdAt: now,
    }).run();

    return created;
  }
}
