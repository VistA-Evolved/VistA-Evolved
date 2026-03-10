/**
 * Audit Shipping Manifest -- Phase 157
 *
 * Generates SHA-256 integrity manifests for uploaded audit JSONL chunks.
 * Each manifest records the content hash, entry range, and chain linkage
 * so the receiving side can verify completeness and integrity without
 * re-reading the full audit trail.
 */

import { createHash } from 'crypto';
import type { AuditShipManifest } from './types.js';
import { randomUUID } from 'crypto';

/**
 * Build a manifest for a chunk of audit JSONL lines.
 *
 * @param tenantId  - Tenant that owns this chunk
 * @param objectKey - S3 object key where chunk is stored
 * @param lines     - Raw JSONL lines (each is a JSON-serialized audit entry)
 * @returns Manifest with integrity hashes
 */
export function buildManifest(
  tenantId: string,
  objectKey: string,
  lines: string[]
): AuditShipManifest {
  // Compute SHA-256 of the full chunk content
  const chunkContent = lines.join('\n') + '\n';
  const contentHash = createHash('sha256').update(chunkContent).digest('hex');
  const byteSize = Buffer.byteLength(chunkContent, 'utf-8');

  // Extract seq and hash from first/last entries
  let firstSeq = 0;
  let lastSeq = 0;
  let lastEntryHash = '';

  try {
    const firstEntry = JSON.parse(lines[0]);
    firstSeq = firstEntry.seq || 0;
  } catch {
    // Malformed first line -- seq stays 0
  }

  try {
    const lastEntry = JSON.parse(lines[lines.length - 1]);
    lastSeq = lastEntry.seq || 0;
    lastEntryHash = lastEntry.hash || '';
  } catch {
    // Malformed last line -- seq stays 0
  }

  return {
    id: randomUUID(),
    tenantId,
    objectKey,
    contentHash,
    entryCount: lines.length,
    firstSeq,
    lastSeq,
    lastEntryHash,
    byteSize,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verify a chunk's content against its manifest.
 *
 * @param chunkContent - Raw JSONL content of the chunk
 * @param manifest     - Manifest to verify against
 * @returns Verification result
 */
export function verifyChunkManifest(
  chunkContent: string,
  manifest: AuditShipManifest
): { valid: boolean; error?: string } {
  const computedHash = createHash('sha256').update(chunkContent).digest('hex');
  if (computedHash !== manifest.contentHash) {
    return {
      valid: false,
      error: `Content hash mismatch: expected ${manifest.contentHash}, got ${computedHash}`,
    };
  }

  const lines = chunkContent.trimEnd().split('\n').filter(Boolean);
  if (lines.length !== manifest.entryCount) {
    return {
      valid: false,
      error: `Entry count mismatch: expected ${manifest.entryCount}, got ${lines.length}`,
    };
  }

  const byteSize = Buffer.byteLength(chunkContent, 'utf-8');
  if (byteSize !== manifest.byteSize) {
    return {
      valid: false,
      error: `Byte size mismatch: expected ${manifest.byteSize}, got ${byteSize}`,
    };
  }

  return { valid: true };
}
