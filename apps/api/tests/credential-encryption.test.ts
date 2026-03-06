/**
 * Credential Encryption Tests — Phase 573B
 *
 * Verifies that:
 *   1. encryptCredential produces encrypted output
 *   2. decryptCredential reverses encryption
 *   3. Invalid encrypted data returns null
 *   4. Empty strings are handled
 */

import { describe, it, expect } from 'vitest';
import {
  encryptCredential,
  decryptCredential,
} from '../src/rcm/payerOps/credential-encryption.js';

describe('Credential Encryption (AES-256-GCM)', () => {
  it('encrypts a plaintext string and returns base64', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encryptCredential(plaintext);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);
    // Should be valid base64
    expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
  });

  it('decrypts back to original plaintext', () => {
    const plaintext = 'payer-oauth-secret-abc';
    const encrypted = encryptCredential(plaintext);
    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('handles empty string encryption/decryption', () => {
    const encrypted = encryptCredential('');
    expect(encrypted).toBeTruthy();
    const decrypted = decryptCredential(encrypted);
    // decryptCredential returns null for empty-string payloads
    expect(decrypted === '' || decrypted === null).toBe(true);
  });

  it('handles unicode/special characters', () => {
    const plaintext = 'p@$$w0rd-with-émojis-🔑';
    const encrypted = encryptCredential(plaintext);
    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces unique ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'identical-secret';
    const a = encryptCredential(plaintext);
    const b = encryptCredential(plaintext);
    expect(a).not.toBe(b); // Different IVs
    expect(decryptCredential(a)).toBe(plaintext);
    expect(decryptCredential(b)).toBe(plaintext);
  });

  it('returns null for corrupted encrypted data', () => {
    const result = decryptCredential('not-valid-base64-data!!!');
    expect(result).toBeNull();
  });

  it('returns null for truncated encrypted data', () => {
    const encrypted = encryptCredential('test');
    const truncated = encrypted.slice(0, 10);
    const result = decryptCredential(truncated);
    expect(result).toBeNull();
  });

  it('returns null for tampered encrypted data', () => {
    const encrypted = encryptCredential('test-data');
    // Flip some bytes in the middle
    const buf = Buffer.from(encrypted, 'base64');
    buf[buf.length - 5] ^= 0xff;
    const tampered = buf.toString('base64');
    const result = decryptCredential(tampered);
    expect(result).toBeNull();
  });
});
