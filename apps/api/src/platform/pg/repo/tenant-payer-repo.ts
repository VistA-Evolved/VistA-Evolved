/**
 * Tenant Payer Repository (PostgreSQL) — tenant-scoped payer config
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 *
 * Mirrors apps/api/src/platform/db/repo/tenant-payer-repo.ts using Postgres.
 */

import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { tenantPayer, payerAuditEvent } from "../pg-schema.js";

export type TenantPayerRow = typeof tenantPayer.$inferSelect;

export async function findTenantPayer(
  tenantId: string,
  payerId: string,
): Promise<TenantPayerRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(tenantPayer)
    .where(
      and(eq(tenantPayer.tenantId, tenantId), eq(tenantPayer.payerId, payerId)),
    );
  return rows[0];
}

export async function listTenantPayers(
  tenantId: string,
): Promise<TenantPayerRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(tenantPayer)
    .where(eq(tenantPayer.tenantId, tenantId));
}

export async function upsertTenantPayer(
  data: {
    tenantId: string;
    payerId: string;
    status?: string;
    notes?: string;
    vaultRef?: string;
  },
  reason: string,
  actor?: string,
): Promise<TenantPayerRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const existing = await findTenantPayer(data.tenantId, data.payerId);

  if (existing) {
    // Update
    await db
      .update(tenantPayer)
      .set({
        status: data.status ?? existing.status,
        notes: data.notes ?? existing.notes,
        vaultRef: data.vaultRef ?? existing.vaultRef,
        updatedAt: new Date(now),
      } as any)
      .where(eq(tenantPayer.id, existing.id));

    const after = (await findTenantPayer(data.tenantId, data.payerId))!;

    // Audit
    await db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId: data.tenantId,
      actorType: actor ? "user" : "system",
      actorId: actor ?? null,
      entityType: "tenant_payer",
      entityId: existing.id,
      action: "update",
      beforeJson: JSON.parse(JSON.stringify(existing)),
      afterJson: JSON.parse(JSON.stringify(after)),
      reason,
      evidenceSnapshotId: null,
      createdAt: new Date(now),
    });

    return after;
  } else {
    // Insert
    const id = randomUUID();
    await db.insert(tenantPayer).values({
      id,
      tenantId: data.tenantId,
      payerId: data.payerId,
      status: data.status ?? "contracting_needed",
      notes: data.notes ?? null,
      vaultRef: data.vaultRef ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    const created = (await findTenantPayer(data.tenantId, data.payerId))!;

    // Audit
    await db.insert(payerAuditEvent).values({
      id: randomUUID(),
      tenantId: data.tenantId,
      actorType: actor ? "user" : "system",
      actorId: actor ?? null,
      entityType: "tenant_payer",
      entityId: id,
      action: "create",
      beforeJson: null,
      afterJson: JSON.parse(JSON.stringify(created)),
      reason,
      evidenceSnapshotId: null,
      createdAt: new Date(now),
    });

    return created;
  }
}
