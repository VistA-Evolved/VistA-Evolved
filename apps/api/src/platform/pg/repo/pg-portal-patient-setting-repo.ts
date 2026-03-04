/**
 * PG Portal Patient Setting Repository — Async durable patient preferences
 *
 * Phase 127: Portal + Telehealth Durability (Map stores -> Postgres)
 *
 * NEW repo (no SQLite predecessor). Persists the in-memory settings Map
 * from portal-settings.ts. Nested preferences stored as JSON columns.
 */

import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { getPgDb } from '../pg-db.js';
import { pgPortalPatientSetting } from '../pg-schema.js';

export type PortalPatientSettingRow = typeof pgPortalPatientSetting.$inferSelect;

/* ── Upsert ────────────────────────────────────────────────── */

export async function upsertSetting(data: {
  tenantId?: string;
  patientDfn: string;
  language: string;
  notificationsJson: string;
  displayJson: string;
  mfaJson: string;
}): Promise<PortalPatientSettingRow> {
  const db = getPgDb();
  const tenantId = data.tenantId ?? 'default';
  const now = new Date().toISOString();

  // Try update first
  const existing = await findSettingByDfn(tenantId, data.patientDfn);
  if (existing) {
    await db
      .update(pgPortalPatientSetting)
      .set({
        language: data.language,
        notificationsJson: data.notificationsJson,
        displayJson: data.displayJson,
        mfaJson: data.mfaJson,
        updatedAt: now,
      })
      .where(eq(pgPortalPatientSetting.id, existing.id));
    return (await findSettingByDfn(tenantId, data.patientDfn))!;
  }

  // Insert
  const id = randomUUID();
  await db.insert(pgPortalPatientSetting).values({
    id,
    tenantId,
    patientDfn: data.patientDfn,
    language: data.language,
    notificationsJson: data.notificationsJson,
    displayJson: data.displayJson,
    mfaJson: data.mfaJson,
    createdAt: now,
    updatedAt: now,
  });
  return (await findSettingById(id))!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export async function findSettingById(id: string): Promise<PortalPatientSettingRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgPortalPatientSetting)
    .where(eq(pgPortalPatientSetting.id, id));
  return rows[0];
}

export async function findSettingByDfn(
  tenantId: string,
  patientDfn: string
): Promise<PortalPatientSettingRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgPortalPatientSetting)
    .where(
      and(
        eq(pgPortalPatientSetting.tenantId, tenantId),
        eq(pgPortalPatientSetting.patientDfn, patientDfn)
      )
    );
  return rows[0];
}

/* ── Delete ────────────────────────────────────────────────── */

export async function deleteSetting(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgPortalPatientSetting).where(eq(pgPortalPatientSetting.id, id));
  return (result as any)?.rowCount > 0;
}

/* ── Count ─────────────────────────────────────────────────── */

export async function countSettings(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(pgPortalPatientSetting);
  return result[0]?.count ?? 0;
}
