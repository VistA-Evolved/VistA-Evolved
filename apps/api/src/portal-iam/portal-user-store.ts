/**
 * Portal User Store — Phase 29
 *
 * In-memory store for portal user accounts.
 * Uses Node.js built-in crypto.scrypt for password hashing (zero npm deps).
 *
 * Key design decisions:
 * - Portal identity is NOT VistA DUZ — separate enrollment model
 * - Password hashed with scrypt (N=16384, r=8, p=1, keyLen=64)
 * - Account lockout after MAX_FAILED_ATTEMPTS (configurable)
 * - Session tokens are randomBytes(32)
 * - Device sessions tracked per user
 *
 * Production migration: Replace Map stores with database.
 */

import { randomBytes, scrypt, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type {
  PortalUser,
  PortalUserStatus,
  PatientProfile,
  DeviceSession,
  PatientRelationship,
} from "./types.js";
import { log } from "../lib/logger.js";

const scryptAsync = promisify(scrypt);

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

export const IAM_CONFIG = {
  /** Max consecutive failed login attempts before lockout */
  maxFailedAttempts: Number(process.env.PORTAL_IAM_MAX_FAILED || 5),
  /** Lockout duration (ms). Default: 15 minutes */
  lockoutDurationMs: Number(process.env.PORTAL_IAM_LOCKOUT_MS || 15 * 60 * 1000),
  /** Password reset token TTL (ms). Default: 1 hour */
  resetTokenTtlMs: Number(process.env.PORTAL_IAM_RESET_TTL_MS || 60 * 60 * 1000),
  /** Device session TTL (ms). Default: 30 days */
  deviceSessionTtlMs: Number(process.env.PORTAL_IAM_DEVICE_TTL_MS || 30 * 24 * 60 * 60 * 1000),
  /** Max portal users (memory guard) */
  maxUsers: Number(process.env.PORTAL_IAM_MAX_USERS || 10000),
  /** Scrypt cost params */
  scryptN: 16384,
  scryptR: 8,
  scryptP: 1,
  scryptKeyLen: 64,
  /** Password min length */
  passwordMinLength: 8,
  /** Password max length */
  passwordMaxLength: 128,
} as const;

/* ------------------------------------------------------------------ */
/* Stores                                                               */
/* ------------------------------------------------------------------ */

const users = new Map<string, PortalUser>();
const usersByUsername = new Map<string, string>(); // username -> userId
const usersByEmail = new Map<string, string>(); // email -> userId

/* Phase 146: DB repo wiring */
let userDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initPortalUserStoreRepo(repo: typeof userDbRepo): void { userDbRepo = repo; }

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function genId(): string {
  return randomBytes(16).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function now(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Password hashing                                                     */
/* ------------------------------------------------------------------ */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const derived = (await scryptAsync(
    password,
    salt,
    IAM_CONFIG.scryptKeyLen
  )) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  const derived = (await scryptAsync(
    password,
    salt,
    IAM_CONFIG.scryptKeyLen
  )) as Buffer;
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

/* ------------------------------------------------------------------ */
/* Password validation                                                  */
/* ------------------------------------------------------------------ */

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < IAM_CONFIG.passwordMinLength) {
    errors.push(`Password must be at least ${IAM_CONFIG.passwordMinLength} characters`);
  }
  if (password.length > IAM_CONFIG.passwordMaxLength) {
    errors.push(`Password must be at most ${IAM_CONFIG.passwordMaxLength} characters`);
  }
  if (!/[A-Z]/.test(password)) errors.push("Password must contain an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain a digit");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Password must contain a special character");
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------ */
/* User CRUD                                                            */
/* ------------------------------------------------------------------ */

export async function createUser(
  username: string,
  email: string,
  password: string,
  displayName: string,
  selfPatient?: { dfn: string; name: string }
): Promise<PortalUser> {
  if (users.size >= IAM_CONFIG.maxUsers) {
    throw new Error("Maximum user capacity reached");
  }
  if (usersByUsername.has(username.toLowerCase())) {
    throw new Error("Username already exists");
  }
  if (usersByEmail.has(email.toLowerCase())) {
    throw new Error("Email already registered");
  }

  const id = genId();
  const passwordHash = await hashPassword(password);

  const profiles: PatientProfile[] = [];
  if (selfPatient) {
    profiles.push({
      id: genId(),
      patientDfn: selfPatient.dfn,
      patientName: selfPatient.name,
      relationship: "self",
      isSelf: true,
      accessLevel: "full",
      enrolledAt: now(),
      verified: false, // needs verification flow
    });
  }

  const user: PortalUser = {
    id,
    username: username.toLowerCase(),
    displayName,
    email: email.toLowerCase(),
    passwordHash,
    status: "active",
    failedAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    totpSecret: null,
    patientProfiles: profiles,
    deviceSessions: [],
    passwordResetToken: null,
    passwordResetExpiry: null,
    createdAt: now(),
    updatedAt: now(),
    lastLoginAt: null,
  };

  users.set(id, user);
  usersByUsername.set(user.username, id);
  usersByEmail.set(user.email, id);

  // Phase 146: Write-through to PG
  userDbRepo?.upsert({ id, tenantId: 'default', username: user.username, email: user.email, displayName: user.displayName, passwordHash: user.passwordHash, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt }).catch(() => {});

  log.info(`Portal user created: ${id}`);
  return user;
}

export function getUserById(id: string): PortalUser | null {
  return users.get(id) ?? null;
}

export function getUserByUsername(username: string): PortalUser | null {
  const id = usersByUsername.get(username.toLowerCase());
  return id ? users.get(id) ?? null : null;
}

export function getUserByEmail(email: string): PortalUser | null {
  const id = usersByEmail.get(email.toLowerCase());
  return id ? users.get(id) ?? null : null;
}

/* ------------------------------------------------------------------ */
/* Authentication                                                       */
/* ------------------------------------------------------------------ */

export interface AuthResult {
  success: boolean;
  user?: PortalUser;
  error?: string;
  requiresMfa?: boolean;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResult> {
  const user = getUserByUsername(username);
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  // Check lockout
  if (user.status === "locked") {
    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      return { success: false, error: "Account is locked. Try again later." };
    }
    // Lockout expired, reset
    user.status = "active";
    user.failedAttempts = 0;
    user.lockedUntil = null;
  }

  if (user.status === "disabled") {
    return { success: false, error: "Account is disabled" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    user.failedAttempts++;
    if (user.failedAttempts >= IAM_CONFIG.maxFailedAttempts) {
      user.status = "locked";
      user.lockedUntil = Date.now() + IAM_CONFIG.lockoutDurationMs;
      log.warn(`Portal user locked out: ${user.id} after ${user.failedAttempts} failed attempts`);
    }
    user.updatedAt = now();

    // Phase 146: Write-through lockout state
    userDbRepo?.upsert({ id: user.id, tenantId: 'default', status: user.status, failedAttempts: user.failedAttempts, updatedAt: user.updatedAt }).catch(() => {});

    return { success: false, error: "Invalid credentials" };
  }

  // Successful auth — reset failed attempts
  user.failedAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = now();
  user.updatedAt = now();

  // Phase 146: Write-through login success
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', status: user.status, failedAttempts: 0, lastLoginAt: user.lastLoginAt, updatedAt: user.updatedAt }).catch(() => {});

  // Check MFA
  if (user.mfaEnabled) {
    return { success: true, user, requiresMfa: true };
  }

  return { success: true, user };
}

/* ------------------------------------------------------------------ */
/* Password Reset                                                       */
/* ------------------------------------------------------------------ */

export function generatePasswordResetToken(userId: string): string | null {
  const user = users.get(userId);
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpiry = Date.now() + IAM_CONFIG.resetTokenTtlMs;
  user.updatedAt = now();

  // Phase 146: Write-through reset token
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', updatedAt: user.updatedAt }).catch(() => {});

  return token; // Return plaintext — only returned once (sent via email)
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const tokenHash = hashToken(token);

  for (const user of users.values()) {
    if (
      user.passwordResetToken === tokenHash &&
      user.passwordResetExpiry &&
      Date.now() < user.passwordResetExpiry
    ) {
      user.passwordHash = await hashPassword(newPassword);
      user.passwordResetToken = null;
      user.passwordResetExpiry = null;
      user.failedAttempts = 0;
      user.lockedUntil = null;
      user.status = "active";
      user.updatedAt = now();

      // Phase 146: Write-through password reset
      userDbRepo?.upsert({ id: user.id, tenantId: 'default', passwordHash: user.passwordHash, status: user.status, failedAttempts: 0, updatedAt: user.updatedAt }).catch(() => {});

      return { success: true };
    }
  }
  return { success: false, error: "Invalid or expired reset token" };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = users.get(userId);
  if (!user) return { success: false, error: "User not found" };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = now();

  // Phase 146: Write-through password change
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', passwordHash: user.passwordHash, updatedAt: user.updatedAt }).catch(() => {});

  return { success: true };
}

/* ------------------------------------------------------------------ */
/* MFA Scaffold (TOTP)                                                  */
/* ------------------------------------------------------------------ */

const MFA_FEATURE_FLAG = process.env.PORTAL_MFA_ENABLED === "true";

export function isMfaEnabled(): boolean {
  return MFA_FEATURE_FLAG;
}

export function setupMfa(userId: string): {
  secret: string;
  uri: string;
} | null {
  if (!MFA_FEATURE_FLAG) return null;
  const user = users.get(userId);
  if (!user) return null;

  // Generate a base32-like secret (real TOTP would use proper base32)
  const secret = randomBytes(20).toString("hex");
  user.totpSecret = secret;
  user.updatedAt = now();

  // Phase 146: Write-through MFA setup
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', mfaEnabled: user.mfaEnabled, updatedAt: user.updatedAt }).catch(() => {});

  const uri = `otpauth://totp/VistA-Evolved:${user.username}?secret=${secret}&issuer=VistA-Evolved`;
  return { secret, uri };
}

export function confirmMfa(userId: string, code: string): boolean {
  if (!MFA_FEATURE_FLAG) return false;
  const user = users.get(userId);
  if (!user || !user.totpSecret) return false;

  // Stub: In production, verify TOTP code against secret + time window
  // For now, accept "000000" in dev mode or validate properly in prod
  if (process.env.NODE_ENV !== "production" && code === "000000") {
    user.mfaEnabled = true;
    user.updatedAt = now();

    // Phase 146: Write-through MFA confirm
    userDbRepo?.upsert({ id: user.id, tenantId: 'default', mfaEnabled: true, updatedAt: user.updatedAt }).catch(() => {});

    return true;
  }

  // Production TOTP validation would go here
  return false;
}

export function disableMfa(userId: string): boolean {
  const user = users.get(userId);
  if (!user) return false;
  user.mfaEnabled = false;
  user.totpSecret = null;
  user.updatedAt = now();

  // Phase 146: Write-through MFA disable
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', mfaEnabled: false, updatedAt: user.updatedAt }).catch(() => {});

  return true;
}

/* ------------------------------------------------------------------ */
/* Patient Profile Enrollment                                           */
/* ------------------------------------------------------------------ */

export function addPatientProfile(
  userId: string,
  profile: Omit<PatientProfile, "id" | "enrolledAt">
): PatientProfile | null {
  const user = users.get(userId);
  if (!user) return null;

  // Check for duplicate DFN mapping
  if (user.patientProfiles.some((p) => p.patientDfn === profile.patientDfn)) {
    return null; // already enrolled
  }

  const fullProfile: PatientProfile = {
    ...profile,
    id: genId(),
    enrolledAt: now(),
  };
  user.patientProfiles.push(fullProfile);
  user.updatedAt = now();

  // Phase 146: Write-through profile add
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', updatedAt: user.updatedAt }).catch(() => {});

  return fullProfile;
}

export function removePatientProfile(userId: string, profileId: string): boolean {
  const user = users.get(userId);
  if (!user) return false;
  const idx = user.patientProfiles.findIndex((p) => p.id === profileId);
  if (idx < 0) return false;
  // Don't allow removing self profile
  if (user.patientProfiles[idx].isSelf) return false;
  user.patientProfiles.splice(idx, 1);
  user.updatedAt = now();

  // Phase 146: Write-through profile remove
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', updatedAt: user.updatedAt }).catch(() => {});

  return true;
}

/* ------------------------------------------------------------------ */
/* Device Session Tracking                                              */
/* ------------------------------------------------------------------ */

export function createDeviceSession(
  userId: string,
  sessionToken: string,
  meta: { userAgent: string; ipAddress: string; deviceType?: DeviceSession["deviceType"] }
): DeviceSession | null {
  const user = users.get(userId);
  if (!user) return null;

  const ds: DeviceSession = {
    id: genId(),
    userId,
    tokenHash: hashToken(sessionToken),
    deviceType: meta.deviceType ?? detectDeviceType(meta.userAgent),
    userAgent: meta.userAgent.slice(0, 200), // truncate UA
    ipAddress: meta.ipAddress,
    geoHint: null,
    createdAt: now(),
    lastActiveAt: now(),
    expiresAt: new Date(Date.now() + IAM_CONFIG.deviceSessionTtlMs).toISOString(),
    active: true,
  };

  user.deviceSessions.push(ds);
  user.updatedAt = now();

  // Phase 146: Write-through device session
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', updatedAt: user.updatedAt }).catch(() => {});

  return ds;
}

function detectDeviceType(ua: string): DeviceSession["deviceType"] {
  const lower = ua.toLowerCase();
  if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) return "mobile";
  if (lower.includes("tablet") || lower.includes("ipad")) return "tablet";
  if (lower.includes("mozilla") || lower.includes("chrome") || lower.includes("safari")) return "browser";
  return "unknown";
}

export function listDeviceSessions(userId: string): DeviceSession[] {
  const user = users.get(userId);
  if (!user) return [];
  // Clean expired
  const cutoff = Date.now();
  user.deviceSessions = user.deviceSessions.filter(
    (ds) => ds.active && new Date(ds.expiresAt).getTime() > cutoff
  );
  return user.deviceSessions;
}

export function revokeDeviceSession(userId: string, sessionId: string): boolean {
  const user = users.get(userId);
  if (!user) return false;
  const ds = user.deviceSessions.find((s) => s.id === sessionId);
  if (!ds) return false;
  ds.active = false;
  user.updatedAt = now();

  // Phase 146: Write-through device revoke
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', updatedAt: user.updatedAt }).catch(() => {});

  return true;
}

export function revokeAllDeviceSessions(userId: string): number {
  const user = users.get(userId);
  if (!user) return 0;
  let count = 0;
  for (const ds of user.deviceSessions) {
    if (ds.active) {
      ds.active = false;
      count++;
    }
  }
  user.updatedAt = now();

  // Phase 146: Write-through revoke all devices
  userDbRepo?.upsert({ id: user.id, tenantId: 'default', updatedAt: user.updatedAt }).catch(() => {});

  return count;
}

/* ------------------------------------------------------------------ */
/* Admin / Stats                                                        */
/* ------------------------------------------------------------------ */

export function getIamStats(): {
  totalUsers: number;
  byStatus: Record<string, number>;
  totalProfiles: number;
  totalDeviceSessions: number;
} {
  const byStatus: Record<string, number> = {};
  let totalProfiles = 0;
  let totalDeviceSessions = 0;

  for (const u of users.values()) {
    byStatus[u.status] = (byStatus[u.status] || 0) + 1;
    totalProfiles += u.patientProfiles.length;
    totalDeviceSessions += u.deviceSessions.filter((d) => d.active).length;
  }

  return {
    totalUsers: users.size,
    byStatus,
    totalProfiles,
    totalDeviceSessions,
  };
}

/* ------------------------------------------------------------------ */
/* Seed dev users (called from index.ts in dev mode)                    */
/* ------------------------------------------------------------------ */

export async function seedDevUsers(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  if (users.size > 0) return; // already seeded

  try {
    await createUser("patient1", "patient1@example.com", "Patient1!", "David Carter", {
      dfn: "100022",
      name: "CARTER,DAVID",
    });
    await createUser("patient2", "patient2@example.com", "Patient2!", "John Smith", {
      dfn: "100033",
      name: "SMITH,JOHN",
    });
    log.info("Portal IAM: dev users seeded");
  } catch {
    // ignore if already exists
  }
}
