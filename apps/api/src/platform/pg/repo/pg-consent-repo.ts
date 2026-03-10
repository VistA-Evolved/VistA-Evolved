/**
 * PG Consent Repository -- Phase 140
 *
 * CRUD for patient_consent and patient_portal_pref tables.
 * All operations are tenant-scoped.
 */

import { eq, and } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgPatientConsent, pgPatientPortalPref } from '../pg-schema.js';
import { randomUUID } from 'node:crypto';

export type PatientConsentRow = typeof pgPatientConsent.$inferSelect;
export type PatientPortalPrefRow = typeof pgPatientPortalPref.$inferSelect;

/* -------------- Patient Consent -------------- */

export async function listConsents(
  patientDfn: string,
  tenantId = 'default'
): Promise<PatientConsentRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgPatientConsent)
    .where(
      and(eq(pgPatientConsent.tenantId, tenantId), eq(pgPatientConsent.patientDfn, patientDfn))
    );
}

export async function upsertConsent(data: {
  patientDfn: string;
  consentType: string;
  status: string;
  locale?: string;
  version?: number;
  metadata?: string;
  tenantId?: string;
}): Promise<PatientConsentRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';
  const id = randomUUID();

  // Try update first
  const existing = await db
    .select()
    .from(pgPatientConsent)
    .where(
      and(
        eq(pgPatientConsent.tenantId, tenantId),
        eq(pgPatientConsent.patientDfn, data.patientDfn),
        eq(pgPatientConsent.consentType, data.consentType)
      )
    );

  if (existing.length > 0) {
    const row = existing[0];
    await db
      .update(pgPatientConsent)
      .set({
        status: data.status,
        signedAt: data.status === 'granted' ? now : row.signedAt,
        revokedAt: data.status === 'revoked' ? now : row.revokedAt,
        locale: data.locale || row.locale,
        version: data.version ?? row.version,
        metadata: data.metadata ?? row.metadata,
        updatedAt: now,
      })
      .where(eq(pgPatientConsent.id, row.id));

    return { ...row, status: data.status, updatedAt: now };
  }

  // Insert new
  const newRow: PatientConsentRow = {
    id,
    tenantId,
    patientDfn: data.patientDfn,
    consentType: data.consentType,
    status: data.status,
    signedAt: data.status === 'granted' ? now : null,
    revokedAt: null,
    locale: data.locale || 'en',
    version: data.version ?? 1,
    metadata: data.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(pgPatientConsent).values(newRow);
  return newRow;
}

/* -------------- Patient Portal Preferences -------------- */

export async function getPortalPref(
  patientDfn: string,
  tenantId = 'default'
): Promise<PatientPortalPrefRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgPatientPortalPref)
    .where(
      and(
        eq(pgPatientPortalPref.tenantId, tenantId),
        eq(pgPatientPortalPref.patientDfn, patientDfn)
      )
    );
  return rows[0] || null;
}

export async function upsertPortalPref(data: {
  patientDfn: string;
  notifications?: string;
  language?: string;
  displayPrefs?: string;
  tenantId?: string;
}): Promise<PatientPortalPrefRow> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const tenantId = data.tenantId || 'default';

  const existing = await getPortalPref(data.patientDfn, tenantId);

  if (existing) {
    await db
      .update(pgPatientPortalPref)
      .set({
        notifications: data.notifications ?? existing.notifications,
        language: data.language ?? existing.language,
        displayPrefs: data.displayPrefs ?? existing.displayPrefs,
        updatedAt: now,
      })
      .where(eq(pgPatientPortalPref.id, existing.id));

    return {
      ...existing,
      notifications: data.notifications ?? existing.notifications,
      language: data.language ?? existing.language,
      displayPrefs: data.displayPrefs ?? existing.displayPrefs,
      updatedAt: now,
    };
  }

  const id = randomUUID();
  const newRow: PatientPortalPrefRow = {
    id,
    tenantId,
    patientDfn: data.patientDfn,
    notifications: data.notifications ?? null,
    language: data.language || 'en',
    displayPrefs: data.displayPrefs ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(pgPatientPortalPref).values(newRow);
  return newRow;
}
