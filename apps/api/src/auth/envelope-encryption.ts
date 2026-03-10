/**
 * Envelope Encryption -- Phase 341 (W16-P5).
 *
 * Implements envelope encryption pattern:
 *   1. Generate random Data Encryption Key (DEK)
 *   2. Encrypt data with DEK using AES-256-GCM
 *   3. Encrypt DEK with Key Encryption Key (KEK) from KeyProvider
 *   4. Return { encryptedData, encryptedDek, iv, authTag, kekId, kekVersion }
 *
 * Decryption reverses: KEK decrypts DEK, DEK decrypts data.
 * Pure Node.js crypto -- no external dependencies.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { resolveKeyProvider, generateKey, type KeyProvider } from './key-provider.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface EnvelopeEncryptionResult {
  /** AES-256-GCM encrypted data (base64). */
  encryptedData: string;
  /** AES-256-GCM encrypted DEK, wrapped by KEK (base64). */
  encryptedDek: string;
  /** IV used for data encryption (base64). */
  iv: string;
  /** GCM auth tag for data encryption (base64). */
  authTag: string;
  /** IV used for DEK encryption (base64). */
  dekIv: string;
  /** GCM auth tag for DEK encryption (base64). */
  dekAuthTag: string;
  /** KEK identifier used to wrap DEK. */
  kekId: string;
  /** KEK version used. */
  kekVersion: number;
  /** Algorithm used. */
  algorithm: string;
}

/* ------------------------------------------------------------------ */
/* Core functions                                                      */
/* ------------------------------------------------------------------ */

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12; // 96-bit IV for GCM
const DEK_LENGTH = 32; // 256-bit DEK

/**
 * Encrypt data using envelope encryption.
 *
 * @param plaintext - Data to encrypt (Buffer or string)
 * @param kekId - Key ID of the KEK in the key provider
 * @param provider - Optional key provider override
 */
export async function envelopeEncrypt(
  plaintext: Buffer | string,
  kekId: string,
  provider?: KeyProvider
): Promise<EnvelopeEncryptionResult> {
  const kp = provider ?? resolveKeyProvider();
  const kek = await kp.getKey(kekId);
  if (!kek) {
    throw new Error(`KEK not found: ${kekId}`);
  }

  // Step 1: Generate random DEK
  const dek = generateKey(DEK_LENGTH);

  // Step 2: Encrypt data with DEK
  const dataIv = randomBytes(IV_LENGTH);
  const dataCipher = createCipheriv(ALGORITHM, dek, dataIv);
  const dataBuf = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
  const encData = Buffer.concat([dataCipher.update(dataBuf), dataCipher.final()]);
  const dataAuthTag = dataCipher.getAuthTag();

  // Step 3: Encrypt DEK with KEK
  const dekIv = randomBytes(IV_LENGTH);
  const dekCipher = createCipheriv(ALGORITHM, kek.key.subarray(0, 32), dekIv);
  const encDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const dekAuthTag = dekCipher.getAuthTag();

  // Zero out plaintext DEK from memory
  dek.fill(0);

  return {
    encryptedData: encData.toString('base64'),
    encryptedDek: encDek.toString('base64'),
    iv: dataIv.toString('base64'),
    authTag: dataAuthTag.toString('base64'),
    dekIv: dekIv.toString('base64'),
    dekAuthTag: dekAuthTag.toString('base64'),
    kekId,
    kekVersion: kek.metadata.version,
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypt envelope-encrypted data.
 *
 * @param envelope - The encryption result from envelopeEncrypt
 * @param provider - Optional key provider override
 */
export async function envelopeDecrypt(
  envelope: EnvelopeEncryptionResult,
  provider?: KeyProvider
): Promise<Buffer> {
  const kp = provider ?? resolveKeyProvider();
  const kek = await kp.getKey(envelope.kekId, envelope.kekVersion);
  if (!kek) {
    throw new Error(`KEK not found: ${envelope.kekId} v${envelope.kekVersion}`);
  }

  // Step 1: Decrypt DEK with KEK
  const dekDecipher = createDecipheriv(
    ALGORITHM,
    kek.key.subarray(0, 32),
    Buffer.from(envelope.dekIv, 'base64')
  );
  dekDecipher.setAuthTag(Buffer.from(envelope.dekAuthTag, 'base64'));
  const dek = Buffer.concat([
    dekDecipher.update(Buffer.from(envelope.encryptedDek, 'base64')),
    dekDecipher.final(),
  ]);

  // Step 2: Decrypt data with DEK
  const dataDecipher = createDecipheriv(ALGORITHM, dek, Buffer.from(envelope.iv, 'base64'));
  dataDecipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  const plaintext = Buffer.concat([
    dataDecipher.update(Buffer.from(envelope.encryptedData, 'base64')),
    dataDecipher.final(),
  ]);

  // Zero out DEK
  dek.fill(0);

  return plaintext;
}

/**
 * Re-encrypt data with a new KEK version (key rotation support).
 * Decrypts with old KEK, re-encrypts with new KEK.
 */
export async function reEncrypt(
  envelope: EnvelopeEncryptionResult,
  newKekId: string,
  provider?: KeyProvider
): Promise<EnvelopeEncryptionResult> {
  const plaintext = await envelopeDecrypt(envelope, provider);
  const result = await envelopeEncrypt(plaintext, newKekId, provider);
  // Zero out plaintext
  plaintext.fill(0);
  return result;
}
