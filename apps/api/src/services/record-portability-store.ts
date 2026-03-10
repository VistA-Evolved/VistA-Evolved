/**
 * Record Portability Store -- Phase 80
 *
 * In-memory store for patient record export artifacts and share links.
 * Matches established patterns: imaging-worklist.ts, room-store.ts, portal-sharing.ts.
 *
 * Security posture:
 *   - Export artifacts encrypted at rest with AES-256-GCM (per-export random key)
 *   - Keys stored in-memory only (destroyed on expiry/revoke)
 *   - TTL cleanup runs every 5 minutes
 *   - No PHI in logs or audit events
 *   - Share links reuse portal-sharing.ts verification patterns
 */

import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { portalAudit } from "./portal-audit.js";
import { log } from "../lib/logger.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export type ExportFormat = "pdf" | "html";

export interface ExportArtifact {
  token: string;
  tenantId: string;
  sessionTokenHash: string;
  patientDfn: string;
  patientName: string;
  format: ExportFormat;
  /** AES-256-GCM encrypted content */
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  /** Per-export symmetric key -- never persisted to disk */
  key: Buffer;
  /** Sections included in this export */
  sections: string[];
  /** RPCs actually called (VistA-first evidence) */
  rpcUsed: string[];
  createdAt: string;
  expiresAt: string;
  downloadCount: number;
  revokedAt: string | null;
}

export interface RecordShareLink {
  id: string;
  token: string;
  exportToken: string; // links to the export artifact
  tenantId: string;
  patientDfn: string;
  patientName: string;
  label: string;
  accessCode: string;
  patientDob: string;
  sections: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  failedAttempts: number;
  locked: boolean;
  lastAccessedAt: string | null;
}

export interface ShareAccessEvent {
  shareId: string;
  accessedAt: string;
  ipHint: string;
  success: boolean;
  action: string;
}

/* ================================================================== */
/* Configuration                                                        */
/* ================================================================== */

const EXPORT_TTL_MS = 60 * 60 * 1000;              // 1 hour default
const SHARE_TTL_MS = 60 * 60 * 1000;               // 1 hour default
const MAX_SHARE_TTL_MS = 24 * 60 * 60 * 1000;      // 24 hours max
const MAX_EXPORTS_PER_PATIENT = 20;
const MAX_SHARES_PER_PATIENT = 10;
const ACCESS_CODE_LENGTH = 6;
const MAX_ACCESS_ATTEMPTS = 3;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;         // 5 minutes

/* ================================================================== */
/* Stores                                                               */
/* ================================================================== */

const exportStore = new Map<string, ExportArtifact>();
const shareStore = new Map<string, RecordShareLink>();
const shareTokenIndex = new Map<string, string>();    // token -> shareId
const accessLog: ShareAccessEvent[] = [];
const MAX_ACCESS_LOG = 5000;

/* ================================================================== */
/* Encryption helpers                                                   */
/* ================================================================== */

function generateExportToken(): string {
  return `exp-${randomBytes(16).toString("hex")}`;
}

function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(ACCESS_CODE_LENGTH);
  for (let i = 0; i < ACCESS_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  return "***";
}

/**
 * Encrypt content with AES-256-GCM.
 * Returns { encrypted, iv, authTag, key } -- key must be stored in-memory only.
 */
export function encryptContent(plaintext: Buffer): {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
  key: Buffer;
} {
  const key = randomBytes(32); // 256-bit
  const iv = randomBytes(12);  // 96-bit nonce for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted, iv, authTag, key };
}

/**
 * Decrypt AES-256-GCM content.
 */
export function decryptContent(
  encrypted: Buffer,
  iv: Buffer,
  authTag: Buffer,
  key: Buffer
): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/* ================================================================== */
/* Export CRUD                                                          */
/* ================================================================== */

export function createExport(opts: {
  tenantId: string;
  sessionToken: string;
  patientDfn: string;
  patientName: string;
  format: ExportFormat;
  content: Buffer;
  sections: string[];
  rpcUsed: string[];
  ttlMs?: number;
}): ExportArtifact | { error: string } {
  // Enforce per-patient limit
  const active = [...exportStore.values()].filter(
    (e) =>
      e.tenantId === opts.tenantId &&
      e.patientDfn === opts.patientDfn &&
      !e.revokedAt &&
      new Date(e.expiresAt) > new Date()
  );
  if (active.length >= MAX_EXPORTS_PER_PATIENT) {
    return { error: `Maximum ${MAX_EXPORTS_PER_PATIENT} active exports. Wait for expiry or revoke an existing export.` };
  }

  const ttl = Math.min(opts.ttlMs || EXPORT_TTL_MS, MAX_SHARE_TTL_MS);
  const token = generateExportToken();
  const { encrypted, iv, authTag, key } = encryptContent(opts.content);

  const artifact: ExportArtifact = {
    token,
    tenantId: opts.tenantId,
    sessionTokenHash: hashSessionToken(opts.sessionToken),
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    format: opts.format,
    encryptedData: encrypted,
    iv,
    authTag,
    key,
    sections: opts.sections,
    rpcUsed: opts.rpcUsed,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl).toISOString(),
    downloadCount: 0,
    revokedAt: null,
  };

  exportStore.set(token, artifact);

  portalAudit("portal.record.export", "success", opts.patientDfn, {
    tenantId: opts.tenantId,
    detail: {
      token: token.slice(0, 8) + "...",
      format: opts.format,
      sections: opts.sections,
      rpcUsed: opts.rpcUsed,
    },
  });

  return artifact;
}

export function getExport(token: string, tenantId: string, patientDfn: string): ExportArtifact | null {
  const artifact = exportStore.get(token);
  if (!artifact) return null;
  if (artifact.tenantId !== tenantId) return null;
  if (artifact.patientDfn !== patientDfn) return null;
  if (artifact.revokedAt) return null;
  if (new Date(artifact.expiresAt) < new Date()) return null;
  return artifact;
}

export function downloadExport(
  token: string,
  tenantId: string,
  patientDfn: string,
  sessionToken: string
): {
  content: Buffer;
  format: ExportFormat;
  patientName: string;
} | { error: string; status: number } {
  const artifact = exportStore.get(token);
  if (!artifact) {
    return { error: "Export not found.", status: 404 };
  }
  if (
    artifact.tenantId !== tenantId ||
    artifact.patientDfn !== patientDfn ||
    artifact.sessionTokenHash !== hashSessionToken(sessionToken)
  ) {
    return { error: "Export not found.", status: 404 };
  }
  if (artifact.revokedAt) {
    return { error: "Export has been revoked.", status: 410 };
  }
  if (new Date(artifact.expiresAt) < new Date()) {
    return { error: "Export has expired.", status: 410 };
  }

  // Decrypt
  const content = decryptContent(
    artifact.encryptedData,
    artifact.iv,
    artifact.authTag,
    artifact.key
  );
  artifact.downloadCount++;

  portalAudit("portal.record.download", "success", artifact.patientDfn, {
    tenantId: artifact.tenantId,
    detail: { token: token.slice(0, 8) + "...", downloadCount: artifact.downloadCount },
  });

  return { content, format: artifact.format, patientName: artifact.patientName };
}

export function getPatientExports(tenantId: string, patientDfn: string): Array<{
  token: string;
  format: ExportFormat;
  sections: string[];
  rpcUsed: string[];
  createdAt: string;
  expiresAt: string;
  downloadCount: number;
  revokedAt: string | null;
}> {
  return [...exportStore.values()]
    .filter((e) => e.tenantId === tenantId && e.patientDfn === patientDfn)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((e) => ({
      token: e.token,
      format: e.format,
      sections: e.sections,
      rpcUsed: e.rpcUsed,
      createdAt: e.createdAt,
      expiresAt: e.expiresAt,
      downloadCount: e.downloadCount,
      revokedAt: e.revokedAt,
    }));
}

export function revokeExport(token: string, tenantId: string, patientDfn: string): boolean {
  const artifact = exportStore.get(token);
  if (!artifact || artifact.tenantId !== tenantId || artifact.patientDfn !== patientDfn) return false;
  if (artifact.revokedAt) return false;
  artifact.revokedAt = new Date().toISOString();
  // Zero out encryption key for forward secrecy
  artifact.key.fill(0);
  portalAudit("portal.record.export.revoke", "success", patientDfn, {
    tenantId,
    detail: { token: token.slice(0, 8) + "..." },
  });
  return true;
}

/* ================================================================== */
/* Share CRUD                                                           */
/* ================================================================== */

export function createRecordShare(opts: {
  exportToken: string;
  tenantId: string;
  patientDfn: string;
  patientName: string;
  patientDob: string;
  label: string;
  sections: string[];
  ttlMs?: number;
}): RecordShareLink | { error: string } {
  // Verify the export exists and belongs to this patient
  const artifact = exportStore.get(opts.exportToken);
  if (!artifact || artifact.tenantId !== opts.tenantId || artifact.patientDfn !== opts.patientDfn) {
    return { error: "Export not found or does not belong to this patient." };
  }
  if (artifact.revokedAt || new Date(artifact.expiresAt) < new Date()) {
    return { error: "Export is expired or revoked." };
  }
  const requested = [...new Set(opts.sections)].sort();
  const exported = [...new Set(artifact.sections)].sort();
  if (
    requested.length !== exported.length ||
    requested.some((section, idx) => section !== exported[idx])
  ) {
    return {
      error:
        "Share sections must exactly match the exported sections. Generate a dedicated export for a narrower share.",
    };
  }

  // Enforce per-patient share limit
  const active = [...shareStore.values()].filter(
    (s) =>
      s.tenantId === opts.tenantId &&
      s.patientDfn === opts.patientDfn &&
      !s.revokedAt &&
      new Date(s.expiresAt) > new Date()
  );
  if (active.length >= MAX_SHARES_PER_PATIENT) {
    return { error: `Maximum ${MAX_SHARES_PER_PATIENT} active shares. Revoke an existing share first.` };
  }

  const ttl = Math.min(opts.ttlMs || SHARE_TTL_MS, MAX_SHARE_TTL_MS);
  const id = `rshare-${randomBytes(6).toString("hex")}`;
  const token = generateShareToken();
  const accessCode = generateAccessCode();

  const share: RecordShareLink = {
    id,
    token,
    exportToken: opts.exportToken,
    tenantId: opts.tenantId,
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    label: opts.label.slice(0, 200),
    accessCode,
    patientDob: opts.patientDob,
    sections: opts.sections,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl).toISOString(),
    revokedAt: null,
    accessCount: 0,
    failedAttempts: 0,
    locked: false,
    lastAccessedAt: null,
  };

  shareStore.set(id, share);
  shareTokenIndex.set(token, id);

  portalAudit("portal.record.share.create", "success", opts.patientDfn, {
    tenantId: opts.tenantId,
    detail: { shareId: id, sections: opts.sections, expiresAt: share.expiresAt },
  });

  return share;
}

export function getPatientShares(tenantId: string, patientDfn: string): RecordShareLink[] {
  return [...shareStore.values()]
    .filter((s) => s.tenantId === tenantId && s.patientDfn === patientDfn)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function revokeRecordShare(shareId: string, tenantId: string, patientDfn: string): boolean {
  const share = shareStore.get(shareId);
  if (!share || share.tenantId !== tenantId || share.patientDfn !== patientDfn) return false;
  if (share.revokedAt) return false;
  share.revokedAt = new Date().toISOString();
  portalAudit("portal.record.share.revoke", "success", patientDfn, {
    tenantId,
    detail: { shareId },
  });
  return true;
}

export function verifyShareAccess(
  token: string,
  accessCode: string,
  patientDob: string,
  ip: string
): { share: RecordShareLink; content: Buffer; format: ExportFormat } | { error: string; retryable: boolean } {
  const shareId = shareTokenIndex.get(token);
  if (!shareId) return { error: "Share link not found or expired.", retryable: false };

  const share = shareStore.get(shareId)!;

  if (new Date(share.expiresAt) < new Date()) {
    return { error: "This share link has expired.", retryable: false };
  }
  if (share.revokedAt) {
    return { error: "This share link has been revoked.", retryable: false };
  }
  if (share.locked) {
    return { error: "This share link is locked due to too many failed attempts.", retryable: false };
  }

  const codeMatch = share.accessCode === accessCode.toUpperCase().trim();
  const dobMatch = share.patientDob === patientDob;

  if (!codeMatch || !dobMatch) {
    share.failedAttempts++;
    if (share.failedAttempts >= MAX_ACCESS_ATTEMPTS) share.locked = true;

    logAccess(share.id, ip, false, "verify_failed");
    portalAudit("portal.record.share.access", "failure", share.patientDfn, {
      tenantId: share.tenantId,
      sourceIp: maskIp(ip),
      detail: { shareId: share.id, failedAttempts: share.failedAttempts, locked: share.locked },
    });

    const remaining = MAX_ACCESS_ATTEMPTS - share.failedAttempts;
    return {
      error: remaining > 0
        ? `Invalid access code or date of birth. ${remaining} attempt(s) remaining.`
        : "This share link is now locked.",
      retryable: remaining > 0,
    };
  }

  // Verify underlying export still valid
  const artifact = exportStore.get(share.exportToken);
  if (!artifact || artifact.revokedAt || new Date(artifact.expiresAt) < new Date()) {
    return { error: "The underlying export has expired or been revoked.", retryable: false };
  }

  // Decrypt export content
  const content = decryptContent(artifact.encryptedData, artifact.iv, artifact.authTag, artifact.key);
  share.accessCount++;
  share.lastAccessedAt = new Date().toISOString();

  logAccess(share.id, ip, true, "verify_success");
  portalAudit("portal.record.share.access", "success", share.patientDfn, {
    tenantId: share.tenantId,
    sourceIp: maskIp(ip),
    detail: { shareId: share.id, accessCount: share.accessCount },
  });

  return { share, content, format: artifact.format };
}

/** Get share preview by token (for public page -- minimal info). */
export function getSharePreview(token: string): {
  patientName: string;
  label: string;
  sections: string[];
  expiresAt: string;
} | null {
  const shareId = shareTokenIndex.get(token);
  if (!shareId) return null;
  const share = shareStore.get(shareId)!;
  if (share.revokedAt || new Date(share.expiresAt) < new Date() || share.locked) return null;
  return {
    patientName: share.patientName.split(",")[0] + ",***",
    label: share.label,
    sections: share.sections,
    expiresAt: share.expiresAt,
  };
}

/* ================================================================== */
/* Audit                                                                */
/* ================================================================== */

function logAccess(shareId: string, ip: string, success: boolean, action: string): void {
  accessLog.push({
    shareId,
    accessedAt: new Date().toISOString(),
    ipHint: maskIp(ip),
    success,
    action,
  });
  while (accessLog.length > MAX_ACCESS_LOG) accessLog.shift();
}

export function getShareAudit(tenantId: string, patientDfn: string): ShareAccessEvent[] {
  // Get all share IDs for this patient
  const patientShareIds = new Set(
    [...shareStore.values()]
      .filter((s) => s.tenantId === tenantId && s.patientDfn === patientDfn)
      .map((s) => s.id)
  );
  return accessLog
    .filter((e) => patientShareIds.has(e.shareId))
    .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt));
}

/* ================================================================== */
/* TTL Cleanup Job                                                      */
/* ================================================================== */

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function runCleanup(): void {
  const now = new Date();
  let expiredExports = 0;
  let expiredShares = 0;

  for (const [token, artifact] of exportStore) {
    if (new Date(artifact.expiresAt) < now) {
      // Zero out key for forward secrecy
      artifact.key.fill(0);
      exportStore.delete(token);
      expiredExports++;
    }
  }

  for (const [id, share] of shareStore) {
    if (new Date(share.expiresAt) < now) {
      shareTokenIndex.delete(share.token);
      shareStore.delete(id);
      expiredShares++;
    }
  }

  if (expiredExports > 0 || expiredShares > 0) {
    log.info("Record portability cleanup", {
      expiredExports,
      expiredShares,
      remainingExports: exportStore.size,
      remainingShares: shareStore.size,
    });
  }
}

export function startCleanupJob(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref(); // Don't block process exit
  log.info("Record portability cleanup job started", { intervalMs: CLEANUP_INTERVAL_MS });
}

export function stopCleanupJob(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/* ================================================================== */
/* Health check                                                         */
/* ================================================================== */

export function getPortabilityStats(tenantId: string, patientDfn?: string): {
  totalExports: number;
  activeExports: number;
  totalShares: number;
  activeShares: number;
  totalAccessEvents: number;
} {
  const now = new Date();
  const scopedExports = [...exportStore.values()].filter(
    (e) => e.tenantId === tenantId && (!patientDfn || e.patientDfn === patientDfn)
  );
  const scopedShares = [...shareStore.values()].filter(
    (s) => s.tenantId === tenantId && (!patientDfn || s.patientDfn === patientDfn)
  );
  return {
    totalExports: scopedExports.length,
    activeExports: scopedExports.filter((e) => !e.revokedAt && new Date(e.expiresAt) > now).length,
    totalShares: scopedShares.length,
    activeShares: scopedShares.filter((s) => !s.revokedAt && new Date(s.expiresAt) > now).length,
    totalAccessEvents: accessLog.filter((event) => {
      const share = shareStore.get(event.shareId);
      return share?.tenantId === tenantId && (!patientDfn || share.patientDfn === patientDfn);
    }).length,
  };
}
