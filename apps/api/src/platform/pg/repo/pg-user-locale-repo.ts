/**
 * PG User Locale Preference Repository -- Phase 132.
 *
 * Persists clinician language preference per user per tenant.
 * Portal patient language is stored in portal_patient_setting (Phase 27).
 */

import { eq, and } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { pgUserLocalePreference } from "../pg-schema.js";
import { randomBytes } from "node:crypto";

export type UserLocaleRow = typeof pgUserLocalePreference.$inferSelect;

const VALID_LOCALES = ["en", "fil", "es"] as const;
export type SupportedLocale = (typeof VALID_LOCALES)[number];

export function isValidLocale(locale: string): locale is SupportedLocale {
  return (VALID_LOCALES as readonly string[]).includes(locale);
}

function genId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

/** Get locale preference for a user in a tenant */
export async function getLocalePreference(
  tenantId: string,
  userDuz: string
): Promise<UserLocaleRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgUserLocalePreference)
    .where(
      and(
        eq(pgUserLocalePreference.tenantId, tenantId),
        eq(pgUserLocalePreference.userDuz, userDuz)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Upsert locale preference for a user */
export async function upsertLocalePreference(
  tenantId: string,
  userDuz: string,
  locale: SupportedLocale
): Promise<UserLocaleRow> {
  const db = getPgDb();
  const existing = await getLocalePreference(tenantId, userDuz);

  if (existing) {
    const updated = now();
    await db
      .update(pgUserLocalePreference)
      .set({ locale, updatedAt: updated })
      .where(eq(pgUserLocalePreference.id, existing.id));
    return { ...existing, locale, updatedAt: updated };
  }

  const row: UserLocaleRow = {
    id: genId(),
    tenantId,
    userDuz,
    locale,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.insert(pgUserLocalePreference).values(row);
  return row;
}
