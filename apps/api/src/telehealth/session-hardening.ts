/**
 * Telehealth Session Hardening — Phase 307 (W12-P9)
 *
 * Cross-cutting hardening for telehealth sessions:
 *   - Heartbeat tracking: detect stale sessions
 *   - Reconnection window: grace period for dropped connections
 *   - Auto-end: terminate abandoned rooms
 *   - Session metrics: track visit quality signals
 *
 * Design:
 *   - Heartbeat is per-participant, per-room
 *   - Reconnection window defaults to 2 minutes
 *   - Auto-end triggered after reconnection window expires with no heartbeat
 *   - All session events audited (no PHI in payloads)
 *
 * This module augments the existing room-store.ts (Phase 30) with
 * resilience features needed for production telehealth deployments.
 */

import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

/** How often heartbeats are expected (ms) */
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.TELEHEALTH_HEARTBEAT_INTERVAL_MS || '15000', 10);

/** Grace period after last heartbeat before marking participant disconnected (ms) */
const RECONNECTION_WINDOW_MS = parseInt(
  process.env.TELEHEALTH_RECONNECTION_WINDOW_MS || '120000',
  10
);

/** If ALL participants miss heartbeat for this long, auto-end the room (ms) */
const AUTO_END_TIMEOUT_MS = parseInt(process.env.TELEHEALTH_AUTO_END_TIMEOUT_MS || '300000', 10);

/** Check interval for stale session sweeper (ms) */
const SWEEP_INTERVAL_MS = 60_000;

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type ParticipantConnectionState =
  | 'connected'
  | 'reconnecting' // Heartbeat missed, within reconnection window
  | 'disconnected' // Reconnection window expired
  | 'ended'; // Participant left

export interface ParticipantHeartbeat {
  roomId: string;
  /** Opaque participant ID (no PHI) */
  participantId: string;
  role: string;
  state: ParticipantConnectionState;
  lastHeartbeatAt: string; // ISO timestamp
  connectedAt: string; // ISO timestamp
  disconnectedAt?: string; // ISO timestamp
  /** Number of reconnection events */
  reconnectionCount: number;
  /** Network quality signal (reported by client) */
  networkQuality?: 'good' | 'fair' | 'poor';
}

export interface SessionMetrics {
  roomId: string;
  /** Total visit duration in seconds */
  durationSeconds: number;
  /** Number of participants who connected */
  participantCount: number;
  /** Number of reconnection events across all participants */
  totalReconnections: number;
  /** Whether the session was auto-ended due to timeout */
  autoEnded: boolean;
  /** Average reported network quality */
  avgNetworkQuality?: 'good' | 'fair' | 'poor';
  /** ISO timestamp of first heartbeat */
  startedAt?: string;
  /** ISO timestamp of last heartbeat */
  lastActivityAt?: string;
}

export interface AutoEndCandidate {
  roomId: string;
  reason: 'all_disconnected' | 'timeout' | 'abandoned';
  lastActivityAt: string;
  silenceSeconds: number;
}

/* ------------------------------------------------------------------ */
/* Store (in-memory, resets on restart)                                 */
/* ------------------------------------------------------------------ */

/** Map<roomId, Map<participantId, ParticipantHeartbeat>> */
const heartbeats = new Map<string, Map<string, ParticipantHeartbeat>>();
const MAX_TRACKED_ROOMS = 2000;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

/** Auto-end callback — wired externally (e.g., to room-store.endRoom) */
let autoEndCallback: ((roomId: string, reason: string) => void) | null = null;

/**
 * Wire the auto-end callback. Called during initialization.
 */
export function setAutoEndCallback(cb: (roomId: string, reason: string) => void): void {
  autoEndCallback = cb;
}

/**
 * Record a heartbeat from a participant.
 */
export function recordHeartbeat(
  roomId: string,
  participantId: string,
  role: string,
  networkQuality?: 'good' | 'fair' | 'poor'
): ParticipantHeartbeat {
  // Enforce capacity
  if (!heartbeats.has(roomId) && heartbeats.size >= MAX_TRACKED_ROOMS) {
    const oldest = heartbeats.keys().next().value;
    if (oldest) heartbeats.delete(oldest);
  }

  const roomMap = heartbeats.get(roomId) || new Map();
  const now = new Date().toISOString();

  const existing = roomMap.get(participantId);
  if (existing) {
    // Track reconnection if previously disconnected/reconnecting
    const wasDisconnected = existing.state === 'disconnected' || existing.state === 'reconnecting';

    existing.lastHeartbeatAt = now;
    existing.state = 'connected';
    existing.networkQuality = networkQuality;
    if (wasDisconnected) {
      existing.reconnectionCount++;
      existing.disconnectedAt = undefined;
      log.info(
        `Telehealth reconnected: room=${roomId} participant=${participantId} reconnections=${existing.reconnectionCount}`
      );
    }
    return existing;
  }

  // New participant
  const hb: ParticipantHeartbeat = {
    roomId,
    participantId,
    role,
    state: 'connected',
    lastHeartbeatAt: now,
    connectedAt: now,
    reconnectionCount: 0,
    networkQuality,
  };
  roomMap.set(participantId, hb);
  heartbeats.set(roomId, roomMap);

  log.info(
    `Telehealth heartbeat: room=${roomId} participant=${participantId} role=${role} state=connected`
  );
  return hb;
}

/**
 * Mark a participant as having left the session.
 */
export function markParticipantEnded(
  roomId: string,
  participantId: string
): ParticipantHeartbeat | undefined {
  const roomMap = heartbeats.get(roomId);
  if (!roomMap) return undefined;

  const hb = roomMap.get(participantId);
  if (!hb) return undefined;

  hb.state = 'ended';
  hb.disconnectedAt = new Date().toISOString();
  return hb;
}

/**
 * Get all heartbeats for a room.
 */
export function getRoomHeartbeats(roomId: string): ParticipantHeartbeat[] {
  const roomMap = heartbeats.get(roomId);
  if (!roomMap) return [];
  return Array.from(roomMap.values());
}

/**
 * Compute session metrics for a room.
 */
export function getSessionMetrics(roomId: string): SessionMetrics {
  const participants = getRoomHeartbeats(roomId);
  const now = Date.now();

  let totalReconnections = 0;
  let startedAt: string | undefined;
  let lastActivityAt: string | undefined;
  let networkScores: number[] = [];

  const qualityMap = { good: 3, fair: 2, poor: 1 };

  for (const p of participants) {
    totalReconnections += p.reconnectionCount;

    if (!startedAt || p.connectedAt < startedAt) {
      startedAt = p.connectedAt;
    }
    if (!lastActivityAt || p.lastHeartbeatAt > lastActivityAt) {
      lastActivityAt = p.lastHeartbeatAt;
    }
    if (p.networkQuality) {
      networkScores.push(qualityMap[p.networkQuality]);
    }
  }

  const durationMs = startedAt ? now - new Date(startedAt).getTime() : 0;

  let avgNetworkQuality: 'good' | 'fair' | 'poor' | undefined;
  if (networkScores.length > 0) {
    const avg = networkScores.reduce((a, b) => a + b, 0) / networkScores.length;
    avgNetworkQuality = avg >= 2.5 ? 'good' : avg >= 1.5 ? 'fair' : 'poor';
  }

  return {
    roomId,
    durationSeconds: Math.round(durationMs / 1000),
    participantCount: participants.length,
    totalReconnections,
    autoEnded: false, // Set by sweeper if applicable
    avgNetworkQuality,
    startedAt,
    lastActivityAt,
  };
}

/**
 * Sweep for stale sessions and auto-end abandoned rooms.
 * Called on an interval.
 */
export function sweepStaleSessions(): AutoEndCandidate[] {
  const now = Date.now();
  const candidates: AutoEndCandidate[] = [];

  for (const [roomId, roomMap] of heartbeats) {
    let allDisconnected = true;
    let lastActivity = 0;

    for (const [, hb] of roomMap) {
      if (hb.state === 'ended') continue;

      const lastHb = new Date(hb.lastHeartbeatAt).getTime();
      const elapsed = now - lastHb;

      if (elapsed > RECONNECTION_WINDOW_MS && hb.state === 'connected') {
        hb.state = 'reconnecting';
        hb.disconnectedAt = new Date().toISOString();
        log.info(`Telehealth reconnecting: room=${roomId} participant=${hb.participantId}`);
      }

      if (elapsed > RECONNECTION_WINDOW_MS + AUTO_END_TIMEOUT_MS && hb.state === 'reconnecting') {
        hb.state = 'disconnected';
        log.info(`Telehealth disconnected: room=${roomId} participant=${hb.participantId}`);
      }

      if (hb.state !== 'disconnected') {
        allDisconnected = false;
      }

      if (lastHb > lastActivity) {
        lastActivity = lastHb;
      }
    }

    // Check if room should be auto-ended
    if (allDisconnected && roomMap.size > 0 && lastActivity > 0) {
      const silenceMs = now - lastActivity;
      if (silenceMs > AUTO_END_TIMEOUT_MS) {
        const candidate: AutoEndCandidate = {
          roomId,
          reason: 'all_disconnected',
          lastActivityAt: new Date(lastActivity).toISOString(),
          silenceSeconds: Math.round(silenceMs / 1000),
        };
        candidates.push(candidate);

        if (autoEndCallback) {
          try {
            autoEndCallback(
              roomId,
              `auto-end: all participants disconnected for ${candidate.silenceSeconds}s`
            );
          } catch (err) {
            log.warn(`Auto-end callback failed: room=${roomId}`, { error: String(err) });
          }
        }

        // Clean up heartbeat tracking for ended room
        heartbeats.delete(roomId);
      }
    }
  }

  if (candidates.length > 0) {
    log.info(`Telehealth sweeper: auto-ended ${candidates.length} abandoned rooms`);
  }

  return candidates;
}

/**
 * Start the stale session sweeper.
 */
export function startSessionSweeper(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(sweepStaleSessions, SWEEP_INTERVAL_MS);
  // Don't keep process alive
  if (sweepTimer && typeof sweepTimer === 'object' && 'unref' in sweepTimer) {
    sweepTimer.unref();
  }
  log.info('Telehealth session sweeper started');
}

/**
 * Stop the stale session sweeper.
 */
export function stopSessionSweeper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
    log.info('Telehealth session sweeper stopped');
  }
}

/**
 * Get hardening configuration for diagnostics.
 */
export function getHardeningConfig(): {
  heartbeatIntervalMs: number;
  reconnectionWindowMs: number;
  autoEndTimeoutMs: number;
  sweepIntervalMs: number;
  trackedRooms: number;
  totalParticipants: number;
} {
  let totalParticipants = 0;
  for (const roomMap of heartbeats.values()) {
    totalParticipants += roomMap.size;
  }
  return {
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    reconnectionWindowMs: RECONNECTION_WINDOW_MS,
    autoEndTimeoutMs: AUTO_END_TIMEOUT_MS,
    sweepIntervalMs: SWEEP_INTERVAL_MS,
    trackedRooms: heartbeats.size,
    totalParticipants,
  };
}

/**
 * Clear all heartbeat data (for testing).
 */
export function clearHeartbeats(): void {
  heartbeats.clear();
}
