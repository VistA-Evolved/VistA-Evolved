/**
 * Telehealth Room Store — Phase 30
 *
 * In-memory room lifecycle management with automatic expiry.
 * Rooms are ephemeral — they reset on API restart (same pattern as
 * imaging-worklist.ts and imaging-ingest.ts from Phase 23).
 *
 * Room lifecycle: created → waiting → active → ended
 *
 * Migration plan to VistA-native storage:
 * 1. Map rooms to VistA Scheduling file entries (File #44.003)
 * 2. Store room state in ^XTMP (auto-purging temporary global)
 * 3. Use SDEC APPOINTMENT STATUS RPC for status sync
 * 4. Replace in-memory Map with VistA-backed store
 *
 * Security:
 * - Room IDs are opaque hex tokens (no PHI)
 * - Rooms auto-expire after MAX_ROOM_TTL_MS (default 4h)
 * - Participants tracked by role, not by DFN
 */

import { randomBytes } from "node:crypto";
import type {
  TelehealthRoom,
  RoomStatus,
  WaitingRoomState,
  WaitingRoomStatus,
  ParticipantRole,
} from "./types.js";
import { log } from "../lib/logger.js";

/** Log DB persistence failures at warn level instead of silently swallowing. */
function dbWarn(op: string, err: unknown): void {
  log.warn(`telehealth-room DB ${op} failed`, { error: String(err) });
}

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

/** Max room lifetime: 4 hours */
const MAX_ROOM_TTL_MS = parseInt(
  process.env.TELEHEALTH_ROOM_TTL_MS || String(4 * 60 * 60 * 1000),
  10
);
/** Cleanup interval: check for expired rooms every 5 min */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
/** Max concurrent rooms */
const MAX_ROOMS = 500;

/* ------------------------------------------------------------------ */
/* DB repo -- lazy-wired after initPlatformDb() (Phase 115)              */
/* Phase 127: Loosened to interface for PG async compat                   */
/* ------------------------------------------------------------------ */

interface RoomRepo {
  insertRoom(data: any): any;
  findRoomById(id: string): any;
  findRoomByAppointment(appointmentId: string): any;
  findActiveRooms(): any;
  updateRoom(id: string, updates: any): any;
  expireRoom(id: string): any;
  cleanupExpiredRooms(): any;
  countRooms(): any;
}
let _repo: RoomRepo | null = null;

/** Wire the telehealth room repo. Called from index.ts. */
export function initTelehealthRoomRepo(repo: RoomRepo): void {
  _repo = repo;
}

/* ------------------------------------------------------------------ */
/* Store (in-memory cache, DB is source of truth when wired)            */
/* ------------------------------------------------------------------ */

interface RoomEntry extends TelehealthRoom {
  /** Participants who have joined */
  participants: Map<string, { role: ParticipantRole; joinedAt: string }>;
  /** Token for room access verification */
  accessToken: string;
}

const rooms = new Map<string, RoomEntry>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function participantsToJson(p: Map<string, { role: ParticipantRole; joinedAt: string }>): string {
  const obj: Record<string, { role: string; joinedAt: string }> = {};
  for (const [k, v] of p) obj[k] = v;
  return JSON.stringify(obj);
}

function jsonToParticipants(json: string): Map<string, { role: ParticipantRole; joinedAt: string }> {
  const m = new Map<string, { role: ParticipantRole; joinedAt: string }>();
  try {
    const obj = JSON.parse(json || "{}");
    for (const [k, v] of Object.entries(obj)) {
      m.set(k, v as { role: ParticipantRole; joinedAt: string });
    }
  } catch (e) { dbWarn("persist", e); }
  return m;
}

function rowToEntry(row: any): RoomEntry {
  return {
    roomId: row.id,
    appointmentId: row.appointmentId ?? "",
    status: row.roomStatus as RoomStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
    participants: jsonToParticipants(row.participantsJson),
    accessToken: row.accessToken ?? "",
    // Extra DB fields available for future queries:
    // patientDfn: row.patientDfn, providerDuz: row.providerDuz,
    // providerName: row.providerName, meetingUrl: row.meetingUrl,
    // scheduledStart: row.scheduledStart, actualStart: row.actualStart,
    // actualEnd: row.actualEnd
  };
}

async function getEntry(roomId: string): Promise<RoomEntry | null> {
  const cached = rooms.get(roomId);
  if (cached) return cached;
  if (_repo) {
    try {
      const row = await Promise.resolve(_repo.findRoomById(roomId));
      if (row) { const e = rowToEntry(row); rooms.set(roomId, e); return e; }
    } catch (e) { dbWarn("persist", e); }
  }
  return null;
}

function persistEntry(entry: RoomEntry): void {
  rooms.set(entry.roomId, entry);
  if (_repo) {
    Promise.resolve(_repo.updateRoom(entry.roomId, {
      roomStatus: entry.status,
      participantsJson: participantsToJson(entry.participants),
      actualStart: entry.status === "active" ? new Date().toISOString() : undefined,
      actualEnd: entry.status === "ended" ? new Date().toISOString() : undefined,
    })).catch(e => dbWarn("persist", e));
  }
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */

export function createRoom(appointmentId: string, roomId: string): TelehealthRoom {
  if (rooms.size >= MAX_ROOMS) {
    for (const [id, room] of rooms) {
      if (room.status === "ended") {
        rooms.delete(id);
        if (rooms.size < MAX_ROOMS) break;
      }
    }
    if (rooms.size >= MAX_ROOMS) {
      throw new Error("Maximum concurrent telehealth rooms reached");
    }
  }

  const now = new Date().toISOString();
  const entry: RoomEntry = {
    roomId,
    appointmentId,
    status: "created",
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + MAX_ROOM_TTL_MS).toISOString(),
    participants: new Map(),
    accessToken: randomBytes(24).toString("hex"),
  };

  rooms.set(roomId, entry);
  if (_repo) {
    Promise.resolve(_repo.insertRoom({
      id: roomId,
      appointmentId,
      patientDfn: "",
      providerDuz: "",
      roomStatus: "created",
      accessToken: entry.accessToken,
      expiresAt: entry.expiresAt,
      scheduledStart: now,
    })).catch(e => dbWarn("persist", e));
  }
  log.info("Telehealth room created", { roomId, appointmentId });
  return toPublicRoom(entry);
}

export async function getRoom(roomId: string): Promise<TelehealthRoom | null> {
  const entry = await getEntry(roomId);
  if (!entry) return null;
  if (isExpired(entry)) {
    expireRoom(entry);
    return null;
  }
  return toPublicRoom(entry);
}

export async function getRoomByAppointment(appointmentId: string): Promise<TelehealthRoom | null> {
  // Check cache first
  for (const entry of rooms.values()) {
    if (entry.appointmentId === appointmentId && entry.status !== "ended") {
      if (isExpired(entry)) { expireRoom(entry); continue; }
      return toPublicRoom(entry);
    }
  }
  // Check DB
  if (_repo) {
    try {
      const row = await Promise.resolve(_repo.findRoomByAppointment(appointmentId));
      if (row) {
        const e = rowToEntry(row);
        if (!isExpired(e)) {
          rooms.set(e.roomId, e);
          return toPublicRoom(e);
        }
      }
    } catch (e) { dbWarn("persist", e); }
  }
  return null;
}

export async function updateRoomStatus(roomId: string, status: RoomStatus): Promise<TelehealthRoom | null> {
  const entry = await getEntry(roomId);
  if (!entry) return null;
  if (isExpired(entry)) { expireRoom(entry); return null; }

  entry.status = status;
  entry.updatedAt = new Date().toISOString();
  persistEntry(entry);
  log.info("Telehealth room status updated", { roomId, status });
  return toPublicRoom(entry);
}

export async function joinRoom(
  roomId: string,
  participantId: string,
  role: ParticipantRole
): Promise<WaitingRoomState | null> {
  const entry = await getEntry(roomId);
  if (!entry || isExpired(entry)) return null;

  const now = new Date().toISOString();
  entry.participants.set(participantId, { role, joinedAt: now });
  entry.updatedAt = now;

  const hasPatient = [...entry.participants.values()].some((p) => p.role === "patient");
  const hasProvider = [...entry.participants.values()].some((p) => p.role === "provider");

  if (hasPatient && hasProvider) {
    entry.status = "active";
  } else if (hasPatient || hasProvider) {
    entry.status = "waiting";
  }

  persistEntry(entry);
  log.info("Telehealth room joined", { roomId, role });
  return toWaitingState(entry);
}

export async function endRoom(roomId: string): Promise<TelehealthRoom | null> {
  const entry = await getEntry(roomId);
  if (!entry) return null;
  entry.status = "ended";
  entry.updatedAt = new Date().toISOString();
  persistEntry(entry);
  log.info("Telehealth room ended", { roomId });
  return toPublicRoom(entry);
}

export async function getWaitingRoomState(roomId: string): Promise<WaitingRoomState | null> {
  const entry = await getEntry(roomId);
  if (!entry || isExpired(entry)) return null;
  return toWaitingState(entry);
}

export async function getRoomAccessToken(roomId: string): Promise<string | null> {
  const entry = await getEntry(roomId);
  if (!entry || isExpired(entry)) return null;
  return entry.accessToken;
}

export async function verifyRoomAccess(roomId: string, token: string): Promise<boolean> {
  const entry = await getEntry(roomId);
  if (!entry || isExpired(entry)) return false;
  // Constant-time comparison
  if (entry.accessToken.length !== token.length) return false;
  let result = 0;
  for (let i = 0; i < entry.accessToken.length; i++) {
    result |= entry.accessToken.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return result === 0;
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                        */
/* ------------------------------------------------------------------ */

export async function listActiveRooms(): Promise<TelehealthRoom[]> {
  // Load from DB if available
  if (_repo) {
    try {
      const rows = await Promise.resolve(_repo.findActiveRooms());
      return (Array.isArray(rows) ? rows : []).map((r: any) => {
        const e = rowToEntry(r);
        if (isExpired(e)) return null;
        return toPublicRoom(e);
      }).filter(Boolean) as TelehealthRoom[];
    } catch (e) { dbWarn("persist", e); }
  }
  const result: TelehealthRoom[] = [];
  for (const entry of rooms.values()) {
    if (isExpired(entry)) { expireRoom(entry); continue; }
    if (entry.status !== "ended") result.push(toPublicRoom(entry));
  }
  return result;
}

export function getRoomStats(): {
  total: number;
  created: number;
  waiting: number;
  active: number;
  ended: number;
} {
  let created = 0, waiting = 0, active = 0, ended = 0;
  for (const entry of rooms.values()) {
    switch (entry.status) {
      case "created": created++; break;
      case "waiting": waiting++; break;
      case "active": active++; break;
      case "ended": ended++; break;
    }
  }
  return { total: rooms.size, created, waiting, active, ended };
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                     */
/* ------------------------------------------------------------------ */

function isExpired(entry: RoomEntry): boolean {
  return new Date(entry.expiresAt).getTime() < Date.now();
}

function expireRoom(entry: RoomEntry): void {
  if (entry.status !== "ended") {
    entry.status = "ended";
    entry.updatedAt = new Date().toISOString();
    rooms.set(entry.roomId, entry);
    if (_repo) {
      Promise.resolve(_repo.expireRoom(entry.roomId)).catch(e => dbWarn("persist", e));
    }
    log.info("Telehealth room expired", { roomId: entry.roomId });
  }
}

function toPublicRoom(entry: RoomEntry): TelehealthRoom {
  return {
    roomId: entry.roomId,
    appointmentId: entry.appointmentId,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    expiresAt: entry.expiresAt,
  };
}

function toWaitingState(entry: RoomEntry): WaitingRoomState {
  const patientEntry = [...entry.participants.values()].find((p) => p.role === "patient");
  const providerEntry = [...entry.participants.values()].find((p) => p.role === "provider");

  let waitingStatus: WaitingRoomStatus = "not_started";
  if (entry.status === "active") waitingStatus = "in_progress";
  else if (entry.status === "ended") waitingStatus = "completed";
  else if (patientEntry && providerEntry) waitingStatus = "in_progress";
  else if (patientEntry) waitingStatus = "patient_waiting";
  else if (providerEntry) waitingStatus = "provider_joined";

  return {
    roomId: entry.roomId,
    appointmentId: entry.appointmentId,
    status: waitingStatus,
    patientJoinedAt: patientEntry?.joinedAt,
    providerJoinedAt: providerEntry?.joinedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Cleanup timer                                                        */
/* ------------------------------------------------------------------ */

export function startRoomCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    // DB-side cleanup
    if (_repo) {
      Promise.resolve(_repo.cleanupExpiredRooms()).catch(e => dbWarn("persist", e));
    }
    // Cache-side cleanup
    let expired = 0;
    for (const entry of rooms.values()) {
      if (isExpired(entry) && entry.status !== "ended") {
        expireRoom(entry);
        expired++;
      }
    }
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    for (const [id, entry] of rooms) {
      if (entry.status === "ended" && entry.updatedAt < oneHourAgo) {
        rooms.delete(id);
      }
    }
    if (expired > 0) {
      log.info("Telehealth room cleanup", { expired });
    }
  }, CLEANUP_INTERVAL_MS);
}

export function stopRoomCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
