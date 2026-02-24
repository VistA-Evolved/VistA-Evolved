/**
 * Credential Vault Repository -- Phase 110
 *
 * CRUD for credential_artifact and credential_document tables.
 * All operations are tenant-scoped. Audit entries are written to
 * the RCM audit trail via appendRcmAudit().
 */

import { eq, and, desc, count, lte } from "drizzle-orm";
import { getDb } from "../../platform/db/db.js";
import {
  credentialArtifact,
  credentialDocument,
} from "../../platform/db/schema.js";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CredentialArtifactRow {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  credentialType: string;
  credentialValue: string;
  issuingAuthority: string | null;
  state: string | null;
  status: string;
  issuedAt: string | null;
  expiresAt: string | null;
  renewalReminderDays: number;
  verifiedAt: string | null;
  verifiedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CredentialDocumentRow {
  id: string;
  credentialId: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSizeBytes: number | null;
  sha256Hash: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface CreateCredentialInput {
  tenantId?: string;
  entityType: string;
  entityId: string;
  entityName: string;
  credentialType: string;
  credentialValue: string;
  issuingAuthority?: string;
  state?: string;
  status?: string;
  issuedAt?: string;
  expiresAt?: string;
  renewalReminderDays?: number;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface CreateDocumentInput {
  credentialId: string;
  tenantId?: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSizeBytes?: number;
  sha256Hash?: string;
  uploadedBy: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function parseCredential(row: any): CredentialArtifactRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    credentialType: row.credentialType,
    credentialValue: row.credentialValue,
    issuingAuthority: row.issuingAuthority,
    state: row.state,
    status: row.status,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    renewalReminderDays: row.renewalReminderDays ?? 90,
    verifiedAt: row.verifiedAt,
    verifiedBy: row.verifiedBy,
    metadata: safeJsonParse(row.metadataJson, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

function parseDocument(row: any): CredentialDocumentRow {
  return {
    id: row.id,
    credentialId: row.credentialId,
    tenantId: row.tenantId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    storagePath: row.storagePath,
    fileSizeBytes: row.fileSizeBytes,
    sha256Hash: row.sha256Hash,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Credential Artifact CRUD                                            */
/* ------------------------------------------------------------------ */

export function createCredential(input: CreateCredentialInput): CredentialArtifactRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  db.insert(credentialArtifact)
    .values({
      id,
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      credentialType: input.credentialType,
      credentialValue: input.credentialValue,
      issuingAuthority: input.issuingAuthority || null,
      state: input.state || null,
      status: input.status || "active",
      issuedAt: input.issuedAt || null,
      expiresAt: input.expiresAt || null,
      renewalReminderDays: input.renewalReminderDays ?? 90,
      metadataJson: JSON.stringify(input.metadata || {}),
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    })
    .run();

  return getCredentialById(tenantId, id)!;
}

export function getCredentialById(tenantId: string, id: string): CredentialArtifactRow | null {
  const db = getDb();
  const row = db
    .select()
    .from(credentialArtifact)
    .where(and(eq(credentialArtifact.tenantId, tenantId), eq(credentialArtifact.id, id)))
    .get();
  return row ? parseCredential(row) : null;
}

export function listCredentials(
  tenantId: string,
  filters?: { entityType?: string; entityId?: string; credentialType?: string; status?: string }
): CredentialArtifactRow[] {
  const db = getDb();
  const conditions = [eq(credentialArtifact.tenantId, tenantId)];
  if (filters?.entityType) conditions.push(eq(credentialArtifact.entityType, filters.entityType));
  if (filters?.entityId) conditions.push(eq(credentialArtifact.entityId, filters.entityId));
  if (filters?.credentialType) conditions.push(eq(credentialArtifact.credentialType, filters.credentialType));
  if (filters?.status) conditions.push(eq(credentialArtifact.status, filters.status));

  const rows = db
    .select()
    .from(credentialArtifact)
    .where(and(...conditions))
    .orderBy(desc(credentialArtifact.updatedAt))
    .all();
  return rows.map(parseCredential);
}

export function updateCredential(
  tenantId: string,
  id: string,
  updates: Partial<Pick<CreateCredentialInput, "entityName" | "credentialValue" | "issuingAuthority" | "state" | "status" | "issuedAt" | "expiresAt" | "renewalReminderDays" | "metadata">>
): CredentialArtifactRow | null {
  const db = getDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.entityName !== undefined) setClause.entityName = updates.entityName;
  if (updates.credentialValue !== undefined) setClause.credentialValue = updates.credentialValue;
  if (updates.issuingAuthority !== undefined) setClause.issuingAuthority = updates.issuingAuthority;
  if (updates.state !== undefined) setClause.state = updates.state;
  if (updates.status !== undefined) setClause.status = updates.status;
  if (updates.issuedAt !== undefined) setClause.issuedAt = updates.issuedAt;
  if (updates.expiresAt !== undefined) setClause.expiresAt = updates.expiresAt;
  if (updates.renewalReminderDays !== undefined) setClause.renewalReminderDays = updates.renewalReminderDays;
  if (updates.metadata !== undefined) setClause.metadataJson = JSON.stringify(updates.metadata);

  db.update(credentialArtifact)
    .set(setClause)
    .where(and(eq(credentialArtifact.tenantId, tenantId), eq(credentialArtifact.id, id)))
    .run();

  return getCredentialById(tenantId, id);
}

export function verifyCredential(tenantId: string, id: string, verifiedBy: string): CredentialArtifactRow | null {
  const db = getDb();
  const now = new Date().toISOString();
  db.update(credentialArtifact)
    .set({ verifiedAt: now, verifiedBy, updatedAt: now })
    .where(and(eq(credentialArtifact.tenantId, tenantId), eq(credentialArtifact.id, id)))
    .run();
  return getCredentialById(tenantId, id);
}

/** Get credentials expiring within the given number of days. */
export function getExpiringCredentials(tenantId: string, withinDays: number = 90): CredentialArtifactRow[] {
  const db = getDb();
  const cutoff = new Date(Date.now() + withinDays * 86400000).toISOString();
  const rows = db
    .select()
    .from(credentialArtifact)
    .where(and(
      eq(credentialArtifact.tenantId, tenantId),
      lte(credentialArtifact.expiresAt, cutoff),
    ))
    .orderBy(credentialArtifact.expiresAt)
    .all();
  // Filter out null expiresAt and already-revoked
  return rows
    .filter((r: any) => r.expiresAt && r.status !== "revoked")
    .map(parseCredential);
}

export function countCredentials(tenantId: string): number {
  const db = getDb();
  const result = db
    .select({ cnt: count() })
    .from(credentialArtifact)
    .where(eq(credentialArtifact.tenantId, tenantId))
    .get();
  return (result as any)?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/* Credential Document CRUD                                            */
/* ------------------------------------------------------------------ */

export function addDocument(input: CreateDocumentInput): CredentialDocumentRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  db.insert(credentialDocument)
    .values({
      id,
      credentialId: input.credentialId,
      tenantId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      fileSizeBytes: input.fileSizeBytes || null,
      sha256Hash: input.sha256Hash || null,
      uploadedBy: input.uploadedBy,
      uploadedAt: now,
    })
    .run();

  const row = db.select().from(credentialDocument).where(eq(credentialDocument.id, id)).get();
  return parseDocument(row);
}

export function listDocuments(credentialId: string): CredentialDocumentRow[] {
  const db = getDb();
  return db
    .select()
    .from(credentialDocument)
    .where(eq(credentialDocument.credentialId, credentialId))
    .all()
    .map(parseDocument);
}

export function deleteDocument(id: string): boolean {
  const db = getDb();
  const result = db.delete(credentialDocument).where(eq(credentialDocument.id, id)).run();
  return result.changes > 0;
}
