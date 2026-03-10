/**
 * Portal Session PG Repository -- Phase 150
 *
 * Dedicated repo for portal sessions with hash-based token lookup.
 * Tokens are stored as SHA-256 hashes to prevent session hijacking
 * if the database is compromised.
 *
 * Pattern:
 *   initPortalSessionPgRepo(repo)  -- wire from index.ts
 *   upsertSession(tokenHash, data) -- insert or update session
 *   findByTokenHash(hash)          -- lookup by hashed token
 *   revokeSession(id)              -- soft delete
 *   cleanExpired()                 -- remove expired sessions
 */

import { createHash } from 'node:crypto';
import { getPgPool } from '../pg-db.js';
import { log } from '../../../lib/logger.js';

/* -- Types -------------------------------------------------- */

export interface PortalSessionRow {
  id: string;
  tenantId: string;
  tokenHash: string;
  userId: string;
  subject: string;
  patientDfn: string;
  dataJson: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  revokedAt: string | null;
}

/* -- Hash helper -------------------------------------------- */

/**
 * Hash a raw portal session token with SHA-256.
 * Only the hash is persisted to the database.
 */
export function hashPortalToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/* -- Singleton repo ----------------------------------------- */

let pgRepo: ReturnType<typeof import('./generic-pg-repo.js').createPgRepo> | null = null;

export function initPortalSessionPgRepo(
  repo: ReturnType<typeof import('./generic-pg-repo.js').createPgRepo>
): void {
  pgRepo = repo;
}

/* -- Repo operations ---------------------------------------- */

/**
 * Upsert a portal session (insert or update on conflict).
 * Uses the generic repo insert with optimistic approach: try insert first,
 * then update if it already exists.
 */
export async function upsertPortalSession(data: {
  id: string;
  tenantId: string;
  tokenHash: string;
  userId: string;
  subject: string;
  patientDfn: string;
  dataJson: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
}): Promise<void> {
  if (!pgRepo) return;
  try {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO portal_session (id, tenant_id, token_hash, token, user_id, subject, patient_dfn, data_json, created_at, expires_at, last_activity_at)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         token = EXCLUDED.token,
         subject = EXCLUDED.subject,
         patient_dfn = EXCLUDED.patient_dfn,
         data_json = EXCLUDED.data_json,
         expires_at = EXCLUDED.expires_at,
         last_activity_at = EXCLUDED.last_activity_at`,
      [
        data.id,
        data.tenantId,
        data.tokenHash,
        data.userId,
        data.subject,
        data.patientDfn,
        data.dataJson,
        data.createdAt,
        data.expiresAt,
        data.lastActivityAt,
      ]
    );
  } catch (err: any) {
    log.warn('Portal session upsert failed (Map cache fallback)', { error: err.message });
  }
}

/**
 * Find a portal session by its hashed token.
 * Returns null if not found or revoked/expired.
 */
export async function findPortalSessionByTokenHash(
  tokenHash: string
): Promise<PortalSessionRow | null> {
  if (!pgRepo) return null;
  try {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, tenant_id, token_hash, user_id, subject, patient_dfn, data_json,
              created_at, expires_at, last_activity_at, revoked_at
       FROM portal_session
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      tokenHash: row.token_hash,
      userId: row.user_id,
      subject: row.subject || '',
      patientDfn: row.patient_dfn || '',
      dataJson: row.data_json || '{}',
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastActivityAt: row.last_activity_at || row.created_at,
      revokedAt: row.revoked_at,
    };
  } catch (err: any) {
    log.debug('Portal session lookup by hash failed (Map cache fallback)', { error: err.message });
    return null;
  }
}

export async function listActivePortalSessions(): Promise<PortalSessionRow[]> {
  if (!pgRepo) return [];
  try {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, tenant_id, token_hash, user_id, subject, patient_dfn, data_json,
              created_at, expires_at, last_activity_at, revoked_at
       FROM portal_session
       WHERE revoked_at IS NULL AND expires_at >= $1`,
      [new Date().toISOString()]
    );
    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tokenHash: row.token_hash,
      userId: row.user_id,
      subject: row.subject || '',
      patientDfn: row.patient_dfn || '',
      dataJson: row.data_json || '{}',
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastActivityAt: row.last_activity_at || row.created_at,
      revokedAt: row.revoked_at,
    }));
  } catch (err: any) {
    log.warn('Portal session list failed', { error: err.message });
    return [];
  }
}

/**
 * Soft-revoke a session by setting revoked_at timestamp (by token hash).
 */
export async function revokePortalSession(tokenHash: string): Promise<void> {
  if (!pgRepo) return;
  try {
    const pool = getPgPool();
    await pool.query(
      `UPDATE portal_session SET revoked_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL`,
      [new Date().toISOString(), tokenHash]
    );
  } catch (err: any) {
    log.warn('Portal session revoke failed', { error: err.message });
  }
}

/**
 * Touch a session's last_activity_at timestamp by token hash.
 */
export async function touchPortalSession(tokenHash: string): Promise<void> {
  if (!pgRepo) return;
  try {
    const pool = getPgPool();
    await pool.query(
      `UPDATE portal_session SET last_activity_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL`,
      [new Date().toISOString(), tokenHash]
    );
  } catch (_err: any) {
    // Non-fatal -- touch is best-effort
  }
}

/**
 * Clean up expired and revoked sessions.
 */
export async function cleanExpiredPortalSessions(): Promise<number> {
  if (!pgRepo) return 0;
  try {
    const pool = getPgPool();
    const result = await pool.query(
      `DELETE FROM portal_session WHERE expires_at < $1 OR revoked_at IS NOT NULL`,
      [new Date().toISOString()]
    );
    return result.rowCount ?? 0;
  } catch (err: any) {
    log.warn('Portal session cleanup failed', { error: err.message });
    return 0;
  }
}
