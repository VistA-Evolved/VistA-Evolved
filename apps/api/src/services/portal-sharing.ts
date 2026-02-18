/**
 * Portal Sharing — Phase 27
 *
 * Share Link + Access Code for time-limited, audited health record sharing.
 * Patients can create share links for specific sections of their health record.
 * External viewers verify with patient DOB + access code.
 *
 * Security:
 * - Links expire after configurable TTL (default 72 hours)
 * - 6-char alphanumeric access code required
 * - Patient DOB verification required
 * - Max active shares per patient: 10
 * - All access logged to audit trail
 * - Revocable by patient at any time
 * - Minimal data exposure (no SSN, only selected sections)
 */

import { randomBytes } from "node:crypto";
import { portalAudit } from "./portal-audit.js";

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_SHARE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const MAX_SHARE_TTL_MS = 168 * 60 * 60 * 1000;    // 7 days
const MAX_ACTIVE_SHARES = 10;
const ACCESS_CODE_LENGTH = 6;
const MAX_ACCESS_ATTEMPTS = 5;

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
const tokenIndex = new Map<string, string>(); // token → shareId
const accessLog: ShareAccessLog[] = [];

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

export function createShareLink(opts: {
  patientDfn: string;
  patientName: string;
  patientDob: string;
  sections: ShareableSection[];
  label: string;
  ttlMs?: number;
}): ShareLink | { error: string } {
  // Enforce max active shares
  const active = [...shareStore.values()].filter(
    (s) =>
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

  const ttl = Math.min(opts.ttlMs || DEFAULT_SHARE_TTL_MS, MAX_SHARE_TTL_MS);
  const id = `share-${randomBytes(6).toString("hex")}`;
  const token = generateToken();
  const accessCode = generateAccessCode();

  const share: ShareLink = {
    id,
    token,
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
  };

  shareStore.set(id, share);
  tokenIndex.set(token, id);

  portalAudit("portal.share.create", "success", opts.patientDfn, {
    detail: { shareId: id, sections: opts.sections, expiresAt: share.expiresAt },
  });

  return share;
}

export function getPatientShares(patientDfn: string): ShareLink[] {
  return [...shareStore.values()]
    .filter((s) => s.patientDfn === patientDfn)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function revokeShare(shareId: string, patientDfn: string): boolean {
  const share = shareStore.get(shareId);
  if (!share || share.patientDfn !== patientDfn) return false;
  if (share.revokedAt) return false;

  share.revokedAt = new Date().toISOString();

  portalAudit("portal.share.revoke", "success", patientDfn, {
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
  ip: string
): ShareLink | { error: string; retryable: boolean } {
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
  const codeMatch = share.accessCode === accessCode.toUpperCase().trim();
  const dobMatch = share.patientDob === patientDob;

  if (!codeMatch || !dobMatch) {
    share.failedAttempts++;
    if (share.failedAttempts >= MAX_ACCESS_ATTEMPTS) {
      share.locked = true;
    }

    accessLog.push({
      shareId: share.id,
      accessedAt: new Date().toISOString(),
      ipHint: maskIp(ip),
      success: false,
    });

    portalAudit("portal.share.access", "failure", share.patientDfn, {
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

  accessLog.push({
    shareId: share.id,
    accessedAt: new Date().toISOString(),
    ipHint: maskIp(ip),
    success: true,
  });

  portalAudit("portal.share.access", "success", share.patientDfn, {
    detail: { shareId: share.id, accessCount: share.accessCount },
  });

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
