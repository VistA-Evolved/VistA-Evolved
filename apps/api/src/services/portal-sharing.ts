/**
 * Portal Sharing -- Phase 27 -> Phase 31 enhancements
 *
 * Share Link + Access Code for time-limited, audited health record sharing.
 * Patients can create share links for specific sections of their health record.
 * External viewers verify with patient DOB + access code.
 *
 * Phase 31 enhancements:
 * - TTL reduced to 60 min default (max 24h)
 * - One-time redeem option (auto-revoke after first successful access)
 * - 3-attempt lockout (reduced from 5)
 * - CAPTCHA stub on verify (ready for real provider)
 * - Curated section subset (meds, allergies, problems, immunizations, labs only)
 *
 * Security:
 * - Links expire after configurable TTL (default 60 minutes)
 * - 6-char alphanumeric access code required
 * - Patient DOB verification required
 * - Max active shares per patient: 10
 * - All access logged to audit trail
 * - Revocable by patient at any time
 * - Minimal data exposure (no SSN, only curated sections)
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { portalAudit } from "./portal-audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_SHARE_TTL_MS = 60 * 60 * 1000;       // 60 minutes (Phase 31)
const MAX_SHARE_TTL_MS = 24 * 60 * 60 * 1000;      // 24 hours (Phase 31)
const MAX_ACTIVE_SHARES = 10;
const ACCESS_CODE_LENGTH = 6;
const MAX_ACCESS_ATTEMPTS = 3;                       // Phase 31: tighter lockout

/** Curated sections allowed for sharing (Phase 31). */
export const SHAREABLE_CURATED_SECTIONS: ShareableSection[] = [
  "medications", "allergies", "problems", "immunizations", "labs",
];

export type ShareableSection =
  | "allergies"
  | "medications"
  | "problems"
  | "vitals"
  | "demographics"
  | "labs"
  | "immunizations";

export interface ShareLink {
  id: string;
  token: string;
  tenantId: string;
  patientDfn: string;
  patientName: string;
  patientDob: string; // ISO date for verification
  sections: ShareableSection[];
  accessCode: string;
  label: string;      // e.g., "For Dr. Smith at Other Hospital"
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  failedAttempts: number;
  locked: boolean;
  lastAccessedAt: string | null;
  /** Phase 31: auto-revoke after first successful access */
  oneTimeRedeem: boolean;
}

export interface ShareAccessLog {
  shareId: string;
  accessedAt: string;
  ipHint: string; // last octet masked for privacy
  success: boolean;
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const shareStore = new Map<string, ShareLink>();
const tokenIndex = new Map<string, string>(); // token -> shareId

/* Phase 146: DB repo wiring */
type ShareRepoRow = {
  id: string;
  tenantId?: string;
  patientDfn?: string;
  token?: string;
  resourceType?: string;
  resourceId?: string | null;
  permissionsJson?: string | null;
  expiresAt?: string;
  accessedCount?: number | null;
  createdAt?: string;
};

type ShareRepo = {
  upsert(d: any): Promise<any>;
  findByTenant?(
    tenantId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<ShareRepoRow[]>;
};

let shareDbRepo: ShareRepo | null = null;
export function initShareStoreRepo(repo: ShareRepo | null): void {
  shareDbRepo = repo;
  if (repo) {
    void rehydrateShareLinks(repo);
  }
}
const accessLog: ShareAccessLog[] = [];

function persistShareRow(share: ShareLink): void {
  shareDbRepo
    ?.upsert({
      id: share.id,
      tenantId: share.tenantId,
      patientDfn: share.patientDfn,
      token: share.token,
      resourceType: share.sections.join(','),
      resourceId: null,
      permissionsJson: JSON.stringify({
        patientName: share.patientName,
        patientDob: share.patientDob,
        sections: share.sections,
        accessCode: share.accessCode,
        label: share.label,
        revokedAt: share.revokedAt,
        failedAttempts: share.failedAttempts,
        locked: share.locked,
        lastAccessedAt: share.lastAccessedAt,
        oneTimeRedeem: share.oneTimeRedeem,
      }),
      expiresAt: share.expiresAt,
      accessedCount: share.accessCount,
      createdAt: share.createdAt,
    })
    .catch((e) => log.warn('PG write-through failed', { error: String(e) }));
}

function fromShareRepoRow(row: ShareRepoRow | null | undefined): ShareLink | null {
  if (!row?.id || !row.patientDfn || !row.token || !row.expiresAt || !row.createdAt) return null;
  let meta: any = {};
  try {
    meta = row.permissionsJson ? JSON.parse(row.permissionsJson) : {};
  } catch {
    meta = {};
  }
  const sections = Array.isArray(meta.sections)
    ? meta.sections.filter((s: unknown): s is ShareableSection => typeof s === "string")
    : String(row.resourceType || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as ShareableSection[];
  if (!meta.patientDob || !meta.accessCode) return null;
  return {
    id: row.id,
    token: row.token,
    tenantId: row.tenantId || "default",
    patientDfn: row.patientDfn,
    patientName: typeof meta.patientName === "string" ? meta.patientName : "Unknown,Patient",
    patientDob: meta.patientDob,
    sections,
    accessCode: meta.accessCode,
    label: typeof meta.label === "string" ? meta.label : "",
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: typeof meta.revokedAt === "string" ? meta.revokedAt : null,
    accessCount: Number(row.accessedCount ?? 0),
    failedAttempts: Number(meta.failedAttempts ?? 0),
    locked: Boolean(meta.locked),
    lastAccessedAt: typeof meta.lastAccessedAt === "string" ? meta.lastAccessedAt : null,
    oneTimeRedeem: Boolean(meta.oneTimeRedeem),
  };
}

function cacheShare(share: ShareLink): void {
  shareStore.set(share.id, share);
  tokenIndex.set(share.token, share.id);
}

async function rehydrateShareLinks(repo: ShareRepo): Promise<void> {
  if (!repo.findByTenant) return;
  try {
    let offset = 0;
    const pageSize = 1000;
    let loaded = 0;
    while (true) {
      const rows = (await repo.findByTenant("default", { limit: pageSize, offset })) || [];
      for (const row of rows) {
        const share = fromShareRepoRow(row);
        if (share) {
          cacheShare(share);
          loaded++;
        }
      }
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
    if (loaded > 0) {
      log.info("Portal share links rehydrated from PG", { count: loaded });
    }
  } catch (err: any) {
    log.warn("Portal share link rehydration failed", { error: err?.message });
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
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

/* ------------------------------------------------------------------ */
/* CRUD                                                                 */
/* ------------------------------------------------------------------ */

/** Phase 31: stub CAPTCHA validation -- always passes, logs warning. */
export function validateCaptcha(token?: string): boolean {
  if (!token) return true; // stub -- no real provider configured
  // When a real provider is added, validate here and return false on failure
  return true;
}

export function createShareLink(opts: {
  tenantId?: string;
  patientDfn: string;
  patientName: string;
  patientDob: string;
  sections: ShareableSection[];
  label: string;
  ttlMs?: number;
  oneTimeRedeem?: boolean;
}): ShareLink | { error: string } {
  // Enforce max active shares
  const active = [...shareStore.values()].filter(
    (s) =>
      s.tenantId === (opts.tenantId ?? 'default') &&
      s.patientDfn === opts.patientDfn &&
      !s.revokedAt &&
      new Date(s.expiresAt) > new Date()
  );
  if (active.length >= MAX_ACTIVE_SHARES) {
    return { error: `Maximum ${MAX_ACTIVE_SHARES} active shares reached. Revoke an existing share first.` };
  }

  if (!opts.sections.length) {
    return { error: "At least one section must be selected." };
  }

  // Phase 31: enforce curated subset
  const disallowed = opts.sections.filter(s => !SHAREABLE_CURATED_SECTIONS.includes(s));
  if (disallowed.length > 0) {
    return { error: `Sections not allowed for sharing: ${disallowed.join(", ")}. Allowed: ${SHAREABLE_CURATED_SECTIONS.join(", ")}` };
  }

  const ttl = Math.min(opts.ttlMs || DEFAULT_SHARE_TTL_MS, MAX_SHARE_TTL_MS);
  const id = `share-${randomBytes(6).toString("hex")}`;
  const token = generateToken();
  const accessCode = generateAccessCode();

  const share: ShareLink = {
    id,
    token,
    tenantId: opts.tenantId ?? 'default',
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    patientDob: opts.patientDob,
    sections: opts.sections,
    accessCode,
    label: opts.label.slice(0, 200),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl).toISOString(),
    revokedAt: null,
    accessCount: 0,
    failedAttempts: 0,
    locked: false,
    lastAccessedAt: null,
    oneTimeRedeem: opts.oneTimeRedeem ?? false,
  };

  cacheShare(share);

  // Phase 146: Write-through to PG
  persistShareRow(share);

  portalAudit("portal.share.create", "success", opts.patientDfn, {
    tenantId: opts.tenantId ?? 'default',
    detail: { shareId: id, sections: opts.sections, expiresAt: share.expiresAt },
  });

  return share;
}

export function getPatientShares(tenantId: string, patientDfn: string): ShareLink[] {
  return [...shareStore.values()]
    .filter((s) => s.tenantId === tenantId && s.patientDfn === patientDfn)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function revokeShare(shareId: string, patientDfn: string, _tenantId: string = 'default'): boolean {
  const share = shareStore.get(shareId);
  if (!share || share.tenantId !== _tenantId || share.patientDfn !== patientDfn) return false;
  if (share.revokedAt) return false;

  share.revokedAt = new Date().toISOString();
  persistShareRow(share);

  portalAudit("portal.share.revoke", "success", patientDfn, {
    tenantId: _tenantId,
    detail: { shareId },
  });

  return true;
}

/* ------------------------------------------------------------------ */
/* External access verification                                         */
/* ------------------------------------------------------------------ */

export function verifyShareAccess(
  token: string,
  accessCode: string,
  patientDob: string,
  ip: string,
  captchaToken?: string
): ShareLink | { error: string; retryable: boolean } {
  // Phase 31: CAPTCHA stub check
  if (!validateCaptcha(captchaToken)) {
    return { error: "CAPTCHA validation failed.", retryable: true };
  }
  const shareId = tokenIndex.get(token);
  if (!shareId) {
    return { error: "Share link not found or expired.", retryable: false };
  }

  const share = shareStore.get(shareId)!;

  // Check expiry
  if (new Date(share.expiresAt) < new Date()) {
    return { error: "This share link has expired.", retryable: false };
  }

  // Check revoked
  if (share.revokedAt) {
    return { error: "This share link has been revoked.", retryable: false };
  }

  // Check locked
  if (share.locked) {
    return { error: "This share link is locked due to too many failed attempts.", retryable: false };
  }

  // Verify access code + DOB
  const normalizedCode = accessCode.toUpperCase().trim();
  const codeMatch = share.accessCode.length === normalizedCode.length &&
    timingSafeEqual(Buffer.from(share.accessCode), Buffer.from(normalizedCode));
  const dobMatch = share.patientDob.length === patientDob.length &&
    timingSafeEqual(Buffer.from(share.patientDob), Buffer.from(patientDob));

  if (!codeMatch || !dobMatch) {
    share.failedAttempts++;
    if (share.failedAttempts >= MAX_ACCESS_ATTEMPTS) {
      share.locked = true;
    }
    persistShareRow(share);

    accessLog.push({
      shareId: share.id,
      accessedAt: new Date().toISOString(),
      ipHint: maskIp(ip),
      success: false,
    });

    portalAudit("portal.share.access", "failure", share.patientDfn, {
      tenantId: share.tenantId,
      detail: { shareId: share.id, failedAttempts: share.failedAttempts, locked: share.locked },
    });

    const remaining = MAX_ACCESS_ATTEMPTS - share.failedAttempts;
    return {
      error: remaining > 0
        ? `Invalid access code or date of birth. ${remaining} attempt(s) remaining.`
        : "This share link is now locked due to too many failed attempts.",
      retryable: remaining > 0,
    };
  }

  // Success
  share.accessCount++;
  share.lastAccessedAt = new Date().toISOString();
  persistShareRow(share);

  accessLog.push({
    shareId: share.id,
    accessedAt: new Date().toISOString(),
    ipHint: maskIp(ip),
    success: true,
  });

  portalAudit("portal.share.access", "success", share.patientDfn, {
    tenantId: share.tenantId,
    detail: { shareId: share.id, accessCount: share.accessCount, oneTimeRedeem: share.oneTimeRedeem },
  });

  // Phase 31: one-time redeem -- auto-revoke after first successful verification
  if (share.oneTimeRedeem) {
    share.revokedAt = new Date().toISOString();
    persistShareRow(share);
    portalAudit("portal.share.revoke", "success", share.patientDfn, {
      tenantId: share.tenantId,
      detail: { shareId: share.id, reason: "one-time-redeem" },
    });
  }

  return share;
}

/** Get minimal share info without verification (for the verify page UI). */
export function getSharePreview(token: string): { patientName: string; sections: string[]; expiresAt: string } | null {
  const shareId = tokenIndex.get(token);
  if (!shareId) return null;
  const share = shareStore.get(shareId)!;
  if (share.revokedAt || new Date(share.expiresAt) < new Date() || share.locked) return null;
  return {
    patientName: share.patientName.split(",")[0] + ",***", // partial name
    sections: share.sections,
    expiresAt: share.expiresAt,
  };
}
