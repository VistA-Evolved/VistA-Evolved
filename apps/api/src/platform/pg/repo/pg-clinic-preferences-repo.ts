/**
 * PG Clinic Preferences Repository -- Phase 139
 *
 * Tenant-scoped scheduling display preferences per clinic.
 * VistA remains the master clinic record; preferences are overlay config.
 */

import { eq, and } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgClinicPreferences } from '../pg-schema.js';

export type ClinicPreferencesRow = typeof pgClinicPreferences.$inferSelect;

/* -- Upsert ---------------------------------------------------------- */

export async function upsertClinicPreferences(data: {
  id: string;
  tenantId?: string;
  clinicIen: string;
  clinicName: string;
  timezone?: string;
  slotDurationMinutes?: number;
  maxDailySlots?: number;
  displayConfig?: string;
  operatingHours?: string;
}): Promise<ClinicPreferencesRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const tenantId = data.tenantId ?? 'default';

  // Check if exists
  const existing = await findByClinicIen(data.clinicIen, tenantId);
  if (existing) {
    // Update
    await db
      .update(pgClinicPreferences)
      .set({
        clinicName: data.clinicName,
        timezone: data.timezone ?? existing.timezone,
        slotDurationMinutes: data.slotDurationMinutes ?? existing.slotDurationMinutes,
        maxDailySlots: data.maxDailySlots ?? existing.maxDailySlots,
        displayConfig: data.displayConfig ?? existing.displayConfig,
        operatingHours: data.operatingHours ?? existing.operatingHours,
        updatedAt: now,
      })
      .where(eq(pgClinicPreferences.id, existing.id));
    return (await findByClinicIen(data.clinicIen, tenantId))!;
  }

  // Insert
  await db.insert(pgClinicPreferences).values({
    id: data.id,
    tenantId,
    clinicIen: data.clinicIen,
    clinicName: data.clinicName,
    timezone: data.timezone ?? 'America/New_York',
    slotDurationMinutes: data.slotDurationMinutes ?? 30,
    maxDailySlots: data.maxDailySlots ?? 20,
    displayConfig: data.displayConfig ?? null,
    operatingHours: data.operatingHours ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return (await findByClinicIen(data.clinicIen, tenantId))!;
}

/* -- Lookup ---------------------------------------------------------- */

export async function findByClinicIen(
  clinicIen: string,
  tenantId = 'default'
): Promise<ClinicPreferencesRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgClinicPreferences)
    .where(
      and(eq(pgClinicPreferences.tenantId, tenantId), eq(pgClinicPreferences.clinicIen, clinicIen))
    );
  return rows[0];
}

export async function findAllByTenant(tenantId = 'default'): Promise<ClinicPreferencesRow[]> {
  const db = getPgDb();
  return db.select().from(pgClinicPreferences).where(eq(pgClinicPreferences.tenantId, tenantId));
}
