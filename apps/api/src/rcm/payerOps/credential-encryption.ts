/**
 * Credential Encryption -- Phase 87: Philippines RCM Foundation
 *
 * Envelope encryption for payer credentials/tokens at rest.
 * Uses AES-256-GCM with random IV per encryption.
 *
 * Design:
 *   - Master key from env var PAYEROPS_CREDENTIAL_KEY (hex, 32 bytes)
 *   - If not set, generates an ephemeral key (dev only -- logged warning)
 *   - Each encrypted blob: iv (12 bytes) + authTag (16 bytes) + ciphertext
 *   - Stored as base64 string
 *
 * Production posture: replace master key with KMS envelope
 * (AWS KMS / Azure Key Vault / GCP KMS). Interface is ready.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { log } from '../../lib/logger.js';
import { safeErr } from '../../lib/safe-error.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let masterKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (masterKey) return masterKey;

  const envKey = process.env.PAYEROPS_CREDENTIAL_KEY;
  if (envKey && envKey.length === 64) {
    masterKey = Buffer.from(envKey, 'hex');
    return masterKey;
  }

  // Dev fallback: generate ephemeral key (lost on restart)
  log.warn('PAYEROPS_CREDENTIAL_KEY not set -- using ephemeral key (credentials lost on restart)');
  masterKey = randomBytes(32);
  return masterKey;
}

/**
 * Encrypt a plaintext string. Returns base64-encoded envelope.
 */
export function encryptCredential(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Envelope: iv + authTag + ciphertext
  const envelope = Buffer.concat([iv, authTag, encrypted]);
  return envelope.toString('base64');
}

/**
 * Decrypt a base64-encoded envelope. Returns plaintext string.
 * Returns null if decryption fails (key mismatch, corrupted data, etc).
 */
export function decryptCredential(envelopeBase64: string): string | null {
  try {
    const key = getMasterKey();
    const envelope = Buffer.from(envelopeBase64, 'base64');

    if (envelope.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) return null;

    const iv = envelope.subarray(0, IV_LENGTH);
    const authTag = envelope.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = envelope.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Test that encryption round-trips correctly.
 * Used by health checks.
 */
export function testEncryptionHealth(): { ok: boolean; error?: string } {
  try {
    const testData = 'payerops-health-check-' + Date.now();
    const encrypted = encryptCredential(testData);
    const decrypted = decryptCredential(encrypted);
    if (decrypted !== testData) {
      return { ok: false, error: 'Round-trip mismatch' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: safeErr(err) };
  }
}
