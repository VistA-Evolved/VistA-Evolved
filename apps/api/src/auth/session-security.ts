/**
 * Session Security Controls -- Phase 338 (W16-P2).
 *
 * Provides device fingerprinting, concurrent session limiting,
 * and session security event logging for hardened auth.
 *
 * Device fingerprint is a SHA-256 hash of:
 *   - User-Agent header
 *   - Accept-Language header
 *   - IP /24 prefix (IPv4) or /48 prefix (IPv6)
 *
 * Concurrent session enforcement evicts the OLDEST session when
 * the limit is exceeded (configurable via MAX_CONCURRENT_SESSIONS).
 *
 * Security events are logged to both the in-memory ring buffer
 * and the immutable audit trail.
 */

import { createHash, randomUUID } from 'crypto';
import { log } from '../lib/logger.js';
import { immutableAudit, type ImmutableAuditAction } from '../lib/immutable-audit.js';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/** Max concurrent sessions per user. Default: 5. */
const MAX_CONCURRENT_SESSIONS = Number(process.env.MAX_CONCURRENT_SESSIONS || 5);

/** Security event ring buffer max size. Default: 5000. */
const MAX_SECURITY_EVENTS = Number(process.env.MAX_SECURITY_EVENTS || 5000);

/** Fingerprint drift detection: minor (warn) vs major (revoke) threshold. */
const FINGERPRINT_MINOR_DRIFT_FIELDS = 1;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DeviceFingerprint {
  /** SHA-256 hash of the full fingerprint */
  hash: string;
  /** Hash of user-agent alone (for drift detection) */
  userAgentHash: string;
  /** IP /24 or /48 prefix */
  ipPrefix: string;
  /** Accept-Language hash */
  langHash: string;
  /** When the fingerprint was first seen */
  firstSeenAt: number;
}

export type SecurityEventType =
  | 'session.created'
  | 'session.destroyed'
  | 'session.rotated'
  | 'session.expired_idle'
  | 'session.expired_absolute'
  | 'session.evicted_concurrent'
  | 'mfa.verified'
  | 'mfa.enrollment_started'
  | 'mfa.enrollment_completed'
  | 'step_up.required'
  | 'step_up.completed'
  | 'fingerprint.drift_minor'
  | 'fingerprint.drift_major'
  | 'concurrent.limit_enforced';

export interface SessionSecurityEvent {
  id: string;
  tenantId: string;
  userId: string;
  sessionId: string;
  eventType: SecurityEventType;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface SessionInfo {
  /** Session token hash (truncated for display) */
  tokenPrefix: string;
  /** User ID (DUZ) */
  userId: string;
  /** Tenant ID */
  tenantId: string;
  /** Device fingerprint */
  fingerprint: DeviceFingerprint;
  /** When the session was created */
  createdAt: number;
  /** Last activity */
  lastActivity: number;
  /** Whether MFA was verified in this session */
  mfaVerified: boolean;
}

/* ------------------------------------------------------------------ */
/* Device Fingerprint                                                  */
/* ------------------------------------------------------------------ */

/**
 * Extract IP /24 prefix (IPv4) or /48 prefix (IPv6).
 * Used for fingerprinting -- not exact IP, reduces sensitivity.
 */
function extractIpPrefix(ip: string): string {
  if (!ip) return 'unknown';

  // Remove IPv6 prefix for IPv4-mapped addresses
  const cleaned = ip.replace(/^::ffff:/, '');

  // IPv4: take first 3 octets
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    return parts.slice(0, 3).join('.') + '.0/24';
  }

  // IPv6: take first 3 groups (48 bits)
  const parts = cleaned.split(':');
  return parts.slice(0, 3).join(':') + '::/48';
}

function hashString(value: string): string {
  return createHash('sha256')
    .update(value || '')
    .digest('hex')
    .slice(0, 16);
}

/**
 * Compute a device fingerprint from request headers and IP.
 */
export function computeDeviceFingerprint(
  userAgent: string,
  acceptLanguage: string,
  ip: string
): DeviceFingerprint {
  const ipPrefix = extractIpPrefix(ip);
  const userAgentHash = hashString(userAgent);
  const langHash = hashString(acceptLanguage);

  // Full fingerprint hash combines all components
  const fullHash = createHash('sha256')
    .update(`${userAgentHash}:${langHash}:${ipPrefix}`)
    .digest('hex')
    .slice(0, 32);

  return {
    hash: fullHash,
    userAgentHash,
    ipPrefix,
    langHash,
    firstSeenAt: Date.now(),
  };
}

/**
 * Detect fingerprint drift between two fingerprints.
 * Returns the number of changed fields (0 = identical, 1 = minor, 2+ = major).
 */
export function detectFingerprintDrift(
  original: DeviceFingerprint,
  current: DeviceFingerprint
): { driftFields: number; changedComponents: string[] } {
  const changed: string[] = [];

  if (original.userAgentHash !== current.userAgentHash) changed.push('userAgent');
  if (original.langHash !== current.langHash) changed.push('acceptLanguage');
  if (original.ipPrefix !== current.ipPrefix) changed.push('ipPrefix');

  return { driftFields: changed.length, changedComponents: changed };
}

/**
 * Check if fingerprint drift is minor (warning) or major (revocation candidate).
 */
export function isMajorDrift(driftFields: number): boolean {
  return driftFields > FINGERPRINT_MINOR_DRIFT_FIELDS;
}

/* ------------------------------------------------------------------ */
/* Session Tracking Store                                              */
/* ------------------------------------------------------------------ */

/** Map of userId -> set of session token hashes. For concurrent session tracking. */
const userSessionsMap = new Map<string, Set<string>>();

/** Map of tokenHash -> SessionInfo. For session listing. */
const sessionInfoMap = new Map<string, SessionInfo>();
const MAX_TOTAL_SESSIONS = 50000;

/**
 * Register a new session for concurrent tracking.
 */
export function registerSession(
  tokenHash: string,
  userId: string,
  tenantId: string,
  fingerprint: DeviceFingerprint
): void {
  // Track token hash for this user
  let userSessions = userSessionsMap.get(userId);
  if (!userSessions) {
    userSessions = new Set();
    userSessionsMap.set(userId, userSessions);
  }
  userSessions.add(tokenHash);

  // Store session info
  const now = Date.now();
  sessionInfoMap.set(tokenHash, {
    tokenPrefix: tokenHash.slice(0, 8) + '...',
    userId,
    tenantId,
    fingerprint,
    createdAt: now,
    lastActivity: now,
    mfaVerified: false,
  });

  // Enforce total session cap -- evict oldest sessions first
  if (sessionInfoMap.size > MAX_TOTAL_SESSIONS) {
    const iter = sessionInfoMap.keys();
    const oldest = iter.next().value;
    if (oldest != null) unregisterSession(oldest);
  }
}

/**
 * Unregister a session (on logout, expiration, or eviction).
 */
export function unregisterSession(tokenHash: string): void {
  const info = sessionInfoMap.get(tokenHash);
  if (info) {
    const userSessions = userSessionsMap.get(info.userId);
    if (userSessions) {
      userSessions.delete(tokenHash);
      if (userSessions.size === 0) userSessionsMap.delete(info.userId);
    }
  }
  sessionInfoMap.delete(tokenHash);
}

/**
 * Get all active sessions for a user.
 */
export function getUserSessions(userId: string): SessionInfo[] {
  const tokenHashes = userSessionsMap.get(userId);
  if (!tokenHashes) return [];

  const sessions: SessionInfo[] = [];
  for (const hash of tokenHashes) {
    const info = sessionInfoMap.get(hash);
    if (info) sessions.push(info);
  }
  return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
}

/**
 * Enforce concurrent session limit. Returns token hashes of evicted sessions.
 */
export function enforceConcurrentSessionLimit(userId: string, tenantId: string): string[] {
  const sessions = getUserSessions(userId);
  if (sessions.length <= MAX_CONCURRENT_SESSIONS) return [];

  // Sort by lastActivity ascending (oldest first)
  const sorted = [...sessions].sort((a, b) => a.lastActivity - b.lastActivity);
  const toEvict = sorted.slice(0, sessions.length - MAX_CONCURRENT_SESSIONS);

  const evictedHashes: string[] = [];
  for (const session of toEvict) {
    // Find the token hash for this session by matching
    for (const [hash, info] of sessionInfoMap) {
      if (info.createdAt === session.createdAt && info.userId === session.userId) {
        evictedHashes.push(hash);
        unregisterSession(hash);
        logSecurityEvent(tenantId, userId, hash.slice(0, 8), 'session.evicted_concurrent', {
          reason: 'concurrent_session_limit',
          limit: MAX_CONCURRENT_SESSIONS,
        });
        break;
      }
    }
  }

  return evictedHashes;
}

/**
 * Update last activity timestamp for a session.
 */
export function touchSessionInfo(tokenHash: string): void {
  const info = sessionInfoMap.get(tokenHash);
  if (info) info.lastActivity = Date.now();
}

/**
 * Mark MFA as verified for a session.
 */
export function markSessionMfaVerified(tokenHash: string): void {
  const info = sessionInfoMap.get(tokenHash);
  if (info) info.mfaVerified = true;
}

/* ------------------------------------------------------------------ */
/* Security Event Log                                                  */
/* ------------------------------------------------------------------ */

const securityEventRing: SessionSecurityEvent[] = [];

/**
 * Log a session security event.
 */
export function logSecurityEvent(
  tenantId: string,
  userId: string,
  sessionId: string,
  eventType: SecurityEventType,
  detail: Record<string, unknown>
): SessionSecurityEvent {
  const evt: SessionSecurityEvent = {
    id: randomUUID(),
    tenantId,
    userId,
    sessionId,
    eventType,
    detail,
    createdAt: Date.now(),
  };

  // Ring buffer
  securityEventRing.push(evt);
  if (securityEventRing.length > MAX_SECURITY_EVENTS) {
    securityEventRing.shift();
  }

  // Immutable audit
  immutableAudit(
    `identity.${eventType}` as ImmutableAuditAction,
    eventType.includes('drift_major') || eventType.includes('evicted') ? 'failure' : 'success',
    { sub: userId, name: '', roles: [] },
    { detail: { ...detail, sessionId, eventType } }
  );

  log.debug('Session security event', { eventType, userId, sessionId });

  return evt;
}

/**
 * Query security events (for admin dashboard).
 */
export function querySecurityEvents(opts?: {
  tenantId?: string;
  userId?: string;
  eventType?: SecurityEventType;
  limit?: number;
}): SessionSecurityEvent[] {
  let filtered = securityEventRing;

  if (opts?.tenantId) filtered = filtered.filter((e) => e.tenantId === opts.tenantId);
  if (opts?.userId) filtered = filtered.filter((e) => e.userId === opts.userId);
  if (opts?.eventType) filtered = filtered.filter((e) => e.eventType === opts.eventType);

  const limit = opts?.limit ?? 100;
  return filtered.slice(-limit);
}

/**
 * Get aggregate counts by event type (for analytics).
 */
export function getSecurityEventCounts(tenantId?: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const evt of securityEventRing) {
    if (tenantId && evt.tenantId !== tenantId) continue;
    counts[evt.eventType] = (counts[evt.eventType] || 0) + 1;
  }
  return counts;
}

/**
 * Get store sizes (for store-policy.ts registration).
 */
export function getSessionSecurityStoreSizes(): {
  userSessions: number;
  sessionInfos: number;
  securityEvents: number;
} {
  return {
    userSessions: userSessionsMap.size,
    sessionInfos: sessionInfoMap.size,
    securityEvents: securityEventRing.length,
  };
}
