/**
 * Audit Shipping Types — Phase 157
 *
 * Shared type definitions for audit JSONL shipping to object store.
 */

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export interface AuditShipConfig {
  /** Enable the audit shipper (default: false) */
  enabled: boolean;
  /** S3/MinIO endpoint URL */
  endpoint: string;
  /** S3 bucket name */
  bucket: string;
  /** AWS access key ID */
  accessKey: string;
  /** AWS secret access key */
  secretKey: string;
  /** AWS region (default: us-east-1) */
  region: string;
  /** Ship interval in milliseconds (default: 300000 = 5 min) */
  intervalMs: number;
  /** Max lines per chunk upload (default: 1000) */
  chunkSize: number;
  /** Use path-style addressing for MinIO (default: true) */
  pathStyle: boolean;
}

/* ------------------------------------------------------------------ */
/* Offset tracking                                                     */
/* ------------------------------------------------------------------ */

export interface AuditShipOffset {
  id: string;
  tenantId: string;
  /** Source file path or "memory" */
  source: string;
  /** Last shipped line number (0-based) */
  lastOffset: number;
  /** SHA-256 of the last shipped line */
  lastHash: string;
  /** ISO 8601 timestamp of last ship */
  shippedAt: string;
}

/* ------------------------------------------------------------------ */
/* Manifest                                                            */
/* ------------------------------------------------------------------ */

export interface AuditShipManifest {
  id: string;
  tenantId: string;
  /** S3 object key for the JSONL chunk */
  objectKey: string;
  /** SHA-256 hash of the uploaded chunk content */
  contentHash: string;
  /** Number of audit entries in this chunk */
  entryCount: number;
  /** First seq number in chunk */
  firstSeq: number;
  /** Last seq number in chunk */
  lastSeq: number;
  /** Hash of last entry in chunk (for chain continuity) */
  lastEntryHash: string;
  /** Byte size of the uploaded chunk */
  byteSize: number;
  /** ISO 8601 timestamp */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export interface AuditShipStatus {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  region: string;
  /** Last successful ship timestamp per tenant */
  lastShipByTenant: Record<string, string>;
  /** Total manifests created */
  totalManifests: number;
  /** Total entries shipped */
  totalEntriesShipped: number;
  /** Job running state */
  jobRunning: boolean;
  /** Ship interval (ms) */
  intervalMs: number;
}
