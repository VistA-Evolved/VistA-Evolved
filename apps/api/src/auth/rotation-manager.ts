/**
 * Key Rotation Manager — Phase 341 (W16-P5).
 *
 * Manages key lifecycle: generation, rotation, retiring, expiry.
 * Rotation is non-destructive — old keys are retained until expired.
 *
 * Flow:
 *   1. Generate new key version (status = "active")
 *   2. Mark previous active version as "retiring"
 *   3. Grace period allows old-key decryption
 *   4. After grace period, mark as "expired"
 */

import { log } from '../lib/logger.js';
import {
  resolveKeyProvider,
  generateKey,
  type KeyProvider,
  type KeyMetadata,
} from './key-provider.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RotationPolicy {
  /** Key ID to manage. */
  keyId: string;
  /** Rotation interval in milliseconds. */
  rotationIntervalMs: number;
  /** Grace period after rotation before old key expires (ms). */
  gracePeriodMs: number;
  /** Key length in bytes. */
  keyLengthBytes: number;
  /** Algorithm. */
  algorithm: string;
}

export interface RotationEvent {
  keyId: string;
  oldVersion: number;
  newVersion: number;
  timestamp: string;
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_ROTATION_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const DEFAULT_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ------------------------------------------------------------------ */
/* Rotation Manager                                                    */
/* ------------------------------------------------------------------ */

const rotationPolicies = new Map<string, RotationPolicy>();
const rotationEvents: RotationEvent[] = [];
const MAX_ROTATION_EVENTS = 1000;

/**
 * Register a rotation policy for a key.
 */
export function registerRotationPolicy(policy: RotationPolicy): void {
  rotationPolicies.set(policy.keyId, policy);
}

/**
 * Get all registered rotation policies.
 */
export function getRotationPolicies(): RotationPolicy[] {
  return Array.from(rotationPolicies.values());
}

/**
 * Get rotation history.
 */
export function getRotationHistory(keyId?: string): RotationEvent[] {
  if (keyId) return rotationEvents.filter((e) => e.keyId === keyId);
  return [...rotationEvents];
}

/**
 * Rotate a key: generate new version, retire previous.
 */
export async function rotateKey(
  keyId: string,
  reason = 'scheduled',
  provider?: KeyProvider
): Promise<RotationEvent> {
  const kp = provider ?? resolveKeyProvider();
  const policy = rotationPolicies.get(keyId);
  const keyLen = policy?.keyLengthBytes ?? 32;

  // Find current active key
  const allKeys = await kp.listKeys();
  const keyVersions = allKeys.filter((k) => k.keyId === keyId);
  const activeVersion = keyVersions.find((k) => k.status === 'active');

  // Generate new key
  const newKey = generateKey(keyLen);
  const newMeta = await kp.putKey(keyId, newKey, {
    algorithm: policy?.algorithm ?? 'aes-256-gcm',
    status: 'active',
  });

  // Zero out new key buffer after storage
  newKey.fill(0);

  // Retire previous active version
  if (activeVersion) {
    await kp.setKeyStatus(keyId, activeVersion.version, 'retiring');
  }

  const event: RotationEvent = {
    keyId,
    oldVersion: activeVersion?.version ?? 0,
    newVersion: newMeta.version,
    timestamp: new Date().toISOString(),
    reason,
  };

  rotationEvents.push(event);
  if (rotationEvents.length > MAX_ROTATION_EVENTS) {
    rotationEvents.shift();
  }

  log.info('Key rotated', {
    keyId,
    newVersion: newMeta.version,
    oldVersion: activeVersion?.version ?? 0,
    reason,
  });

  return event;
}

/**
 * Expire retiring keys that have exceeded their grace period.
 */
export async function expireRetiringKeys(provider?: KeyProvider): Promise<number> {
  const kp = provider ?? resolveKeyProvider();
  const allKeys = await kp.listKeys();
  let expired = 0;

  for (const keyMeta of allKeys) {
    if (keyMeta.status !== 'retiring') continue;
    const policy = rotationPolicies.get(keyMeta.keyId);
    const gracePeriod = policy?.gracePeriodMs ?? DEFAULT_GRACE_PERIOD_MS;

    const rotatedAt = keyMeta.rotatedAt
      ? new Date(keyMeta.rotatedAt).getTime()
      : new Date(keyMeta.createdAt).getTime();

    if (Date.now() - rotatedAt > gracePeriod) {
      await kp.setKeyStatus(keyMeta.keyId, keyMeta.version, 'expired');
      expired++;
      log.info('Key expired', { keyId: keyMeta.keyId, version: keyMeta.version });
    }
  }

  return expired;
}

/**
 * Check which keys are due for rotation.
 */
export async function checkRotationDue(provider?: KeyProvider): Promise<KeyMetadata[]> {
  const kp = provider ?? resolveKeyProvider();
  const allKeys = await kp.listKeys();
  const due: KeyMetadata[] = [];

  for (const keyMeta of allKeys) {
    if (keyMeta.status !== 'active') continue;
    const policy = rotationPolicies.get(keyMeta.keyId);
    if (!policy) continue;

    const createdAt = new Date(keyMeta.createdAt).getTime();
    if (Date.now() - createdAt > policy.rotationIntervalMs) {
      due.push(keyMeta);
    }
  }

  return due;
}

/**
 * Get a rotation status summary for all managed keys.
 */
export async function getRotationStatus(provider?: KeyProvider): Promise<{
  keys: Array<{
    keyId: string;
    activeVersion: number | null;
    totalVersions: number;
    lastRotated: string | null;
    dueForRotation: boolean;
  }>;
  totalPolicies: number;
  totalEvents: number;
}> {
  const kp = provider ?? resolveKeyProvider();
  const allKeys = await kp.listKeys();
  const dueKeys = await checkRotationDue(kp);
  const dueIds = new Set(dueKeys.map((k) => k.keyId));

  // Group by keyId
  const grouped = new Map<string, KeyMetadata[]>();
  for (const k of allKeys) {
    const list = grouped.get(k.keyId) ?? [];
    list.push(k);
    grouped.set(k.keyId, list);
  }

  const keys = Array.from(grouped.entries()).map(([keyId, versions]) => {
    const active = versions.find((v) => v.status === 'active');
    const lastEvent = rotationEvents.filter((e) => e.keyId === keyId).pop();
    return {
      keyId,
      activeVersion: active?.version ?? null,
      totalVersions: versions.length,
      lastRotated: lastEvent?.timestamp ?? null,
      dueForRotation: dueIds.has(keyId),
    };
  });

  return {
    keys,
    totalPolicies: rotationPolicies.size,
    totalEvents: rotationEvents.length,
  };
}

/**
 * Initialize default rotation policies from env vars.
 */
export function initDefaultRotationPolicies(): void {
  const interval = parseInt(
    process.env.KEY_ROTATION_INTERVAL_MS || String(DEFAULT_ROTATION_INTERVAL_MS),
    10
  );
  const grace = parseInt(process.env.KEY_ROTATION_GRACE_MS || String(DEFAULT_GRACE_PERIOD_MS), 10);

  // Register policies for well-known key IDs
  const wellKnownKeys = ['session', 'audit', 'envelope', 'csrf'];
  for (const keyId of wellKnownKeys) {
    registerRotationPolicy({
      keyId,
      rotationIntervalMs: interval,
      gracePeriodMs: grace,
      keyLengthBytes: 32,
      algorithm: 'aes-256-gcm',
    });
  }
}
