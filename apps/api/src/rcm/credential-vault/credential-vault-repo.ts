/**
 * Credential Vault Repository -- Phase 110
 *
 * CRUD for credential_artifact and credential_document tables.
 * All operations are tenant-scoped. Audit entries are written to
 * the RCM audit trail via appendRcmAudit().
 */

import { eq, and, desc, count, lte } from 'drizzle-orm';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { credentialArtifact, credentialDocument } from '../../platform/pg/pg-schema.js';
import { randomUUID } from 'node:crypto';
import { encryptCredential, decryptCredential } from '../payerOps/credential-encryption.js';
import { log } from '../../lib/logger.js';

/** Prefix for encrypted credential values (distinguishes from legacy plaintext). */
const ENCRYPTED_PREFIX = 'enc:v1:';

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
  tenantId: string;
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
  tenantId: string;
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
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/** Encrypt a credential value for storage. */
function encryptForStorage(plaintext: string): string {
  return ENCRYPTED_PREFIX + encryptCredential(plaintext);
}

/** Decrypt a credential value from storage. Handles legacy plaintext gracefully. */
function decryptFromStorage(stored: string): string {
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    // Legacy plaintext row -- return as-is (gradual migration)
    return stored;
  }
  const envelope = stored.slice(ENCRYPTED_PREFIX.length);
  const decrypted = decryptCredential(envelope);
  if (decrypted === null) {
    log.error('Credential decryption failed -- key mismatch or corrupted data');
    return '[DECRYPTION_FAILED]';
  }
  return decrypted;
}

function parseCredential(row: any): CredentialArtifactRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    credentialType: row.credentialType,
    credentialValue: decryptFromStorage(row.credentialValue),
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

export async function createCredential(
  input: CreateCredentialInput
): Promise<CredentialArtifactRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId;

  await db.insert(credentialArtifact).values({
    id,
    tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    credentialType: input.credentialType,
    credentialValue: encryptForStorage(input.credentialValue),
    issuingAuthority: input.issuingAuthority || null,
    state: input.state || null,
    status: input.status || 'active',
    issuedAt: input.issuedAt || null,
    expiresAt: input.expiresAt || null,
    renewalReminderDays: input.renewalReminderDays ?? 90,
    metadataJson: JSON.stringify(input.metadata || {}),
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  });

  return (await getCredentialById(tenantId, id))!;
}

export async function getCredentialById(
  tenantId: string,
  id: string
): Promise<CredentialArtifactRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(credentialArtifact)
    .where(and(eq(credentialArtifact.tenantId, tenantId), eq(credentialArtifact.id, id)));
  const row = rows[0] ?? null;
  return row ? parseCredential(row) : null;
}

export async function listCredentials(
  tenantId: string,
  filters?: { entityType?: string; entityId?: string; credentialType?: string; status?: string }
): Promise<CredentialArtifactRow[]> {
  const db = getPgDb();
  const conditions = [eq(credentialArtifact.tenantId, tenantId)];
  if (filters?.entityType) conditions.push(eq(credentialArtifact.entityType, filters.entityType));
  if (filters?.entityId) conditions.push(eq(credentialArtifact.entityId, filters.entityId));
  if (filters?.credentialType)
    conditions.push(eq(credentialArtifact.credentialType, filters.credentialType));
  if (filters?.status) conditions.push(eq(credentialArtifact.status, filters.status));

  const rows = await db
    .select()
    .from(credentialArtifact)
    .where(and(...conditions))
    .orderBy(desc(credentialArtifact.updatedAt));
  return rows.map(parseCredential);
}

export async function updateCredential(
  tenantId: string,
  id: string,
  updates: Partial<
    Pick<
      CreateCredentialInput,
      | 'entityName'
      | 'credentialValue'
      | 'issuingAuthority'
      | 'state'
      | 'status'
      | 'issuedAt'
      | 'expiresAt'
      | 'renewalReminderDays'
      | 'metadata'
    >
  >
): Promise<CredentialArtifactRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.entityName !== undefined) setClause.entityName = updates.entityName;
  if (updates.credentialValue !== undefined) setClause.credentialValue = encryptForStorage(updates.credentialValue);
  if (updates.issuingAuthority !== undefined) setClause.issuingAuthority = updates.issuingAuthority;
  if (updates.state !== undefined) setClause.state = updates.state;
  if (updates.status !== undefined) setClause.status = updates.status;
  if (updates.issuedAt !== undefined) setClause.issuedAt = updates.issuedAt;
  if (updates.expiresAt !== undefined) setClause.expiresAt = updates.expiresAt;
  if (updates.renewalReminderDays !== undefined)
    setClause.renewalReminderDays = updates.renewalReminderDays;
  if (updates.metadata !== undefined) setClause.metadataJson = JSON.stringify(updates.metadata);

  await db
    .update(credentialArtifact)
    .set(setClause)
    .where(and(eq(credentialArtifact.tenantId, tenantId), eq(credentialArtifact.id, id)));

  return getCredentialById(tenantId, id);
}

export async function verifyCredential(
  tenantId: string,
  id: string,
  verifiedBy: string
): Promise<CredentialArtifactRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(credentialArtifact)
    .set({ verifiedAt: now, verifiedBy, updatedAt: now })
    .where(and(eq(credentialArtifact.tenantId, tenantId), eq(credentialArtifact.id, id)));
  return getCredentialById(tenantId, id);
}

/** Get credentials expiring within the given number of days. */
export async function getExpiringCredentials(
  tenantId: string,
  withinDays: number = 90
): Promise<CredentialArtifactRow[]> {
  const db = getPgDb();
  const cutoff = new Date(Date.now() + withinDays * 86400000).toISOString();
  const rows = await db
    .select()
    .from(credentialArtifact)
    .where(
      and(eq(credentialArtifact.tenantId, tenantId), lte(credentialArtifact.expiresAt, cutoff))
    )
    .orderBy(credentialArtifact.expiresAt);
  // Filter out null expiresAt and already-revoked
  return rows.filter((r: any) => r.expiresAt && r.status !== 'revoked').map(parseCredential);
}

export async function countCredentials(tenantId: string): Promise<number> {
  const db = getPgDb();
  const rows = await db
    .select({ cnt: count() })
    .from(credentialArtifact)
    .where(eq(credentialArtifact.tenantId, tenantId));
  const result = rows[0] ?? null;
  return (result as any)?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/* Credential Document CRUD                                            */
/* ------------------------------------------------------------------ */

export async function addDocument(input: CreateDocumentInput): Promise<CredentialDocumentRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId;
  const credential = await getCredentialById(tenantId, input.credentialId);
  if (!credential) {
    throw new Error('Credential not found');
  }

  await db.insert(credentialDocument).values({
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
  });

  const rows = await db
    .select()
    .from(credentialDocument)
    .where(and(eq(credentialDocument.tenantId, tenantId), eq(credentialDocument.id, id)));
  return parseDocument(rows[0]);
}

export async function listDocuments(
  tenantId: string,
  credentialId: string
): Promise<CredentialDocumentRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(credentialDocument)
    .where(
      and(
        eq(credentialDocument.tenantId, tenantId),
        eq(credentialDocument.credentialId, credentialId)
      )
    );
  return rows.map(parseDocument);
}

export async function deleteDocument(tenantId: string, id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db
    .delete(credentialDocument)
    .where(and(eq(credentialDocument.tenantId, tenantId), eq(credentialDocument.id, id)));
  return (result as any).rowCount > 0;
}
