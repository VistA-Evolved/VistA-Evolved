/**
 * Audit JSONL Shipper — Phase 157
 *
 * Periodically ships new immutable audit JSONL entries to S3/MinIO
 * object storage. Tracks offsets in Postgres (or SQLite for dev)
 * to ensure idempotent, retryable uploads.
 *
 * Architecture:
 *   1. Read audit JSONL file from last shipped offset
 *   2. Group lines by tenantId
 *   3. Upload tenant-partitioned chunks to S3
 *   4. Store manifest with SHA-256 integrity hashes
 *   5. Update offset in database
 *
 * Object key format:
 *   audit/{tenantId}/YYYY/MM/DD/{timestamp}_{firstSeq}-{lastSeq}.jsonl
 *   audit/{tenantId}/YYYY/MM/DD/{timestamp}_{firstSeq}-{lastSeq}.manifest.json
 */

import { existsSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { log } from "../lib/logger.js";
import { immutableAudit } from "../lib/immutable-audit.js";
import { S3Client } from "./s3-client.js";
import { buildManifest } from "./manifest.js";
import type { AuditShipConfig, AuditShipOffset, AuditShipManifest, AuditShipStatus } from "./types.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

function loadConfig(): AuditShipConfig {
  return {
    enabled: process.env.AUDIT_SHIP_ENABLED === "true",
    endpoint: process.env.AUDIT_SHIP_ENDPOINT || "http://localhost:9000",
    bucket: process.env.AUDIT_SHIP_BUCKET || "vista-evolved-audit",
    accessKey: process.env.AUDIT_SHIP_ACCESS_KEY || "",
    secretKey: process.env.AUDIT_SHIP_SECRET_KEY || "",
    region: process.env.AUDIT_SHIP_REGION || "us-east-1",
    intervalMs: Number(process.env.AUDIT_SHIP_INTERVAL_MS) || 300_000,
    chunkSize: Number(process.env.AUDIT_SHIP_CHUNK_SIZE) || 1000,
    pathStyle: process.env.AUDIT_SHIP_PATH_STYLE !== "false", // default true for MinIO
  };
}

const AUDIT_FILE_PATH = process.env.IMMUTABLE_AUDIT_FILE_PATH || "logs/immutable-audit.jsonl";

/* ------------------------------------------------------------------ */
/* In-memory state (offsets + manifests cached for API responses)       */
/* ------------------------------------------------------------------ */

/** Offset tracking per tenant+source. Persisted to DB when PG available. */
const offsets = new Map<string, AuditShipOffset>();

/** Manifests — most recent per tenant for status reporting. Max 500. */
const manifests: AuditShipManifest[] = [];
const MAX_MANIFESTS = 500;

let shipperTimer: ReturnType<typeof setInterval> | null = null;
let shipperRunning = false;
let lastShipResult: { ok: boolean; entriesShipped: number; error?: string } | null = null;

/* ------------------------------------------------------------------ */
/* DB persistence (optional — works in-memory if no PG)                */
/* ------------------------------------------------------------------ */

type DbRepo = {
  getOffset(tenantId: string, source: string): AuditShipOffset | null;
  setOffset(offset: AuditShipOffset): void;
  insertManifest(manifest: AuditShipManifest): void;
  listManifests(limit: number): AuditShipManifest[];
};

let dbRepo: DbRepo | null = null;

/** Register a DB-backed repo for offset/manifest persistence. */
export function setShipperDbRepo(repo: DbRepo): void {
  dbRepo = repo;
  // Load existing offsets from DB into memory
  log.info("Audit shipper DB repo registered");
}

/* ------------------------------------------------------------------ */
/* Offset helpers                                                      */
/* ------------------------------------------------------------------ */

function getOffsetKey(tenantId: string, source: string): string {
  return `${tenantId}:${source}`;
}

function getLastOffset(tenantId: string, source: string): number {
  const key = getOffsetKey(tenantId, source);
  const cached = offsets.get(key);
  if (cached) return cached.lastOffset;
  // Try DB
  if (dbRepo) {
    const dbOffset = dbRepo.getOffset(tenantId, source);
    if (dbOffset) {
      offsets.set(key, dbOffset);
      return dbOffset.lastOffset;
    }
  }
  return 0;
}

function saveOffset(tenantId: string, source: string, offset: number, hash: string): void {
  const entry: AuditShipOffset = {
    id: `${tenantId}:${source}:${offset}`,
    tenantId,
    source,
    lastOffset: offset,
    lastHash: hash,
    shippedAt: new Date().toISOString(),
  };
  offsets.set(getOffsetKey(tenantId, source), entry);
  if (dbRepo) {
    try { dbRepo.setOffset(entry); } catch { /* non-fatal */ }
  }
}

/* ------------------------------------------------------------------ */
/* Core shipping logic                                                 */
/* ------------------------------------------------------------------ */

/** A line with its global file index for accurate offset tracking. */
interface IndexedLine {
  lineIdx: number;
  raw: string;
}

/**
 * Read new JSONL lines from the audit file since the last shipped offset.
 * Returns lines grouped by tenant ID, preserving global file offsets.
 */
function readNewLines(config: AuditShipConfig): Map<string, IndexedLine[]> {
  const result = new Map<string, IndexedLine[]>();

  if (!existsSync(AUDIT_FILE_PATH)) {
    return result;
  }

  const content = readFileSync(AUDIT_FILE_PATH, "utf-8");
  const allLines = content.trimEnd().split("\n").filter(Boolean);

  // First pass: identify all tenants and their lines
  const tenantLines = new Map<string, IndexedLine[]>();

  for (let i = 0; i < allLines.length; i++) {
    try {
      const entry = JSON.parse(allLines[i]);
      const tenantId = entry.tenantId || "default";
      if (!tenantLines.has(tenantId)) {
        tenantLines.set(tenantId, []);
      }
      tenantLines.get(tenantId)!.push({ lineIdx: i, raw: allLines[i] });
    } catch {
      // Malformed line — skip
    }
  }

  // For each tenant, filter to unshipped lines only
  for (const [tenantId, lines] of tenantLines) {
    const lastOffset = getLastOffset(tenantId, AUDIT_FILE_PATH);
    const newLines = lines.filter((l) => l.lineIdx >= lastOffset);

    if (newLines.length > 0) {
      // Limit to chunk size
      const chunk = newLines.slice(0, config.chunkSize);
      result.set(tenantId, chunk);
    }
  }

  return result;
}

/**
 * Generate the S3 object key for a chunk.
 */
function chunkObjectKey(tenantId: string, firstSeq: number, lastSeq: number): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ts = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `audit/${tenantId}/${yyyy}/${mm}/${dd}/${ts}_${firstSeq}-${lastSeq}.jsonl`;
}

/**
 * Ship one cycle: read new lines, upload chunks, record manifests.
 */
export async function shipOneCycle(): Promise<{
  ok: boolean;
  entriesShipped: number;
  chunks: number;
  errors: string[];
}> {
  const config = loadConfig();
  if (!config.enabled) {
    return { ok: true, entriesShipped: 0, chunks: 0, errors: [] };
  }

  if (!config.accessKey || !config.secretKey) {
    return { ok: false, entriesShipped: 0, chunks: 0, errors: ["Missing S3 credentials"] };
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
    bucket: config.bucket,
    pathStyle: config.pathStyle,
  });

  // Read new lines grouped by tenant
  const tenantChunks = readNewLines(config);
  if (tenantChunks.size === 0) {
    return { ok: true, entriesShipped: 0, chunks: 0, errors: [] };
  }

  let totalEntries = 0;
  let totalChunks = 0;
  const errors: string[] = [];

  for (const [tenantId, indexedLines] of tenantChunks) {
    const lines = indexedLines.map((l) => l.raw);

    // Build chunk content
    const chunkContent = lines.join("\n") + "\n";
    const chunkBuffer = Buffer.from(chunkContent, "utf-8");

    // Build manifest
    const manifest = buildManifest(tenantId, "", lines);
    const objectKey = chunkObjectKey(tenantId, manifest.firstSeq, manifest.lastSeq);
    manifest.objectKey = objectKey;

    // Upload chunk
    const putResult = await client.putObject(objectKey, chunkBuffer);
    if (!putResult.ok) {
      errors.push(`Failed to upload chunk for tenant ${tenantId}: ${putResult.error}`);
      continue;
    }

    // Upload manifest alongside chunk
    const manifestKey = objectKey.replace(/\.jsonl$/, ".manifest.json");
    const manifestResult = await client.putManifest(manifestKey, manifest as unknown as Record<string, unknown>);
    if (!manifestResult.ok) {
      log.warn("Manifest upload failed (non-fatal, chunk uploaded)", { manifestKey, error: manifestResult.error });
    }

    // Update offset using the original file index (no re-read needed)
    const lastIndexedLine = indexedLines[indexedLines.length - 1];
    const lastHash = createHash("sha256").update(lastIndexedLine.raw).digest("hex");
    saveOffset(tenantId, AUDIT_FILE_PATH, lastIndexedLine.lineIdx + 1, lastHash);

    // Store manifest
    manifests.push(manifest);
    while (manifests.length > MAX_MANIFESTS) manifests.shift();
    if (dbRepo) {
      try { dbRepo.insertManifest(manifest); } catch { /* non-fatal */ }
    }

    totalEntries += lines.length;
    totalChunks++;

    log.info("Audit chunk shipped", {
      tenantId,
      objectKey,
      entryCount: lines.length,
      firstSeq: manifest.firstSeq,
      lastSeq: manifest.lastSeq,
      byteSize: manifest.byteSize,
      contentHash: manifest.contentHash.slice(0, 12),
    });
  }

  // Audit the shipping event itself
  immutableAudit(
    "audit.export",
    errors.length === 0 ? "success" : "error",
    { sub: "system", name: "audit-shipper", roles: ["system"] },
    {
      detail: {
        action: "audit_ship_cycle",
        entriesShipped: totalEntries,
        chunksCreated: totalChunks,
        errors: errors.length,
      },
    },
  );

  lastShipResult = {
    ok: errors.length === 0,
    entriesShipped: totalEntries,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };

  return { ok: errors.length === 0, entriesShipped: totalEntries, chunks: totalChunks, errors };
}

/* ------------------------------------------------------------------ */
/* Scheduled job                                                       */
/* ------------------------------------------------------------------ */

export function startShipperJob(): void {
  const config = loadConfig();
  if (!config.enabled) {
    log.info("Audit shipper disabled (AUDIT_SHIP_ENABLED != true)");
    return;
  }

  if (shipperTimer) return; // idempotent

  log.info("Audit shipper job starting", {
    endpoint: config.endpoint,
    bucket: config.bucket,
    intervalMs: config.intervalMs,
  });

  // Initial ship after 10s delay (let audit file populate)
  setTimeout(async () => {
    try {
      shipperRunning = true;
      await shipOneCycle();
    } catch (err: any) {
      log.error("Audit shipper initial cycle failed", { error: err.message });
    } finally {
      shipperRunning = false;
    }
  }, 10_000);

  // Periodic ship
  shipperTimer = setInterval(async () => {
    if (shipperRunning) return; // skip if previous cycle still running
    try {
      shipperRunning = true;
      await shipOneCycle();
    } catch (err: any) {
      log.error("Audit shipper cycle failed", { error: err.message });
    } finally {
      shipperRunning = false;
    }
  }, config.intervalMs);

  shipperTimer.unref(); // don't keep process alive
}

export function stopShipperJob(): void {
  if (shipperTimer) {
    clearInterval(shipperTimer);
    shipperTimer = null;
  }
  shipperRunning = false;
  log.info("Audit shipper job stopped");
}

/* ------------------------------------------------------------------ */
/* Status API                                                          */
/* ------------------------------------------------------------------ */

export function getShipperStatus(): AuditShipStatus {
  const config = loadConfig();

  const lastShipByTenant: Record<string, string> = {};
  for (const [, offset] of offsets) {
    lastShipByTenant[offset.tenantId] = offset.shippedAt;
  }

  let totalEntriesShipped = 0;
  for (const m of manifests) {
    totalEntriesShipped += m.entryCount;
  }

  return {
    enabled: config.enabled,
    endpoint: config.enabled ? config.endpoint : "(disabled)",
    bucket: config.bucket,
    region: config.region,
    lastShipByTenant,
    totalManifests: manifests.length,
    totalEntriesShipped,
    jobRunning: shipperTimer !== null,
    intervalMs: config.intervalMs,
  };
}

export function getShipperManifests(limit = 50): AuditShipManifest[] {
  return manifests.slice(-limit);
}

export function getLastShipResult(): typeof lastShipResult {
  return lastShipResult;
}

/** Check if S3 connectivity is healthy */
export async function checkS3Connectivity(): Promise<{ ok: boolean; error?: string }> {
  const config = loadConfig();
  if (!config.enabled) return { ok: false, error: "Shipper disabled" };
  if (!config.accessKey || !config.secretKey) return { ok: false, error: "Missing credentials" };

  const client = new S3Client({
    endpoint: config.endpoint,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
    bucket: config.bucket,
    pathStyle: config.pathStyle,
  });

  const result = await client.headBucket();
  return { ok: result.exists, error: result.error };
}
