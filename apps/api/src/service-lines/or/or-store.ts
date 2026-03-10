/**
 * apps/api/src/service-lines/or/or-store.ts
 *
 * Phase 466 (W31-P3). In-memory OR case & room store.
 *
 * Phase 524 (W38): PG write-through -- fire-and-forget durability.
 */

import { randomBytes } from 'crypto';
import { log } from '../../lib/logger.js';
import type {
  OrCase,
  OrCaseStatus,
  OrRoom,
  OrBlock,
  OrMilestone,
  AnesthesiaRecord,
  OrBoardMetrics,
} from './types.js';

// -- PG Write-Through (Phase 524 / W38) ----------------------------

interface OrDbRepo {
  insertOrCase(data: any): Promise<any>;
  updateOrCase(id: string, patch: any): Promise<any>;
  insertOrRoom(data: any): Promise<any>;
  updateOrRoom(id: string, patch: any): Promise<any>;
  insertOrBlock(data: any): Promise<any>;
}

let dbRepo: OrDbRepo | null = null;

export function initOrStoreRepo(repo: OrDbRepo): void {
  dbRepo = repo;
}

function dbWarn(op: string, err: any): void {
  if (process.env.NODE_ENV !== 'test') {
    log.warn(`[or-store] DB ${op} failed (cache-only fallback)`, { err: err?.message ?? err });
  }
}

// -- Stores ---------------------------------------------------------

const cases = new Map<string, OrCase>();
const rooms = new Map<string, OrRoom>();
const blocks = new Map<string, OrBlock>();

// -- Seed default rooms ---------------------------------------------

function seedRooms() {
  const defs = [
    { name: 'OR-1', location: 'Main OR', capabilities: ['general', 'cardiac'] },
    { name: 'OR-2', location: 'Main OR', capabilities: ['general', 'neuro'] },
    { name: 'OR-3', location: 'Main OR', capabilities: ['general', 'ortho'] },
    { name: 'OR-4', location: 'Main OR', capabilities: ['general', 'robotic'] },
    { name: 'OR-5', location: 'Ambulatory Surgery', capabilities: ['general', 'ent'] },
    { name: 'OR-6', location: 'Ambulatory Surgery', capabilities: ['general', 'ophtho'] },
  ];
  for (const d of defs) {
    const id = d.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    rooms.set(id, { id, ...d, status: 'available' });
  }
}
seedRooms();

// -- Room CRUD ------------------------------------------------------

export function getRoom(id: string): OrRoom | undefined {
  return rooms.get(id);
}
export function listRooms(): OrRoom[] {
  return Array.from(rooms.values());
}

export function updateRoomStatus(id: string, status: OrRoom['status']): boolean {
  const room = rooms.get(id);
  if (!room) return false;
  room.status = status;

  if (dbRepo) {
    dbRepo.updateOrRoom(id, { status }).catch((e: unknown) => dbWarn('updateOrRoom', e));
  }

  return true;
}

// -- Case CRUD ------------------------------------------------------

export function createCase(data: {
  patientDfn: string;
  priority: OrCase['priority'];
  scheduledDate: string;
  estimatedDurationMin: number;
  surgeon: string;
  procedure: string;
  procedureCpt?: string;
  laterality?: OrCase['laterality'];
  roomId?: string;
  scheduledStartTime?: string;
}): OrCase {
  const id = `or-${randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const orCase: OrCase = {
    id,
    patientDfn: data.patientDfn,
    status: 'scheduled',
    priority: data.priority,
    roomId: data.roomId,
    scheduledDate: data.scheduledDate,
    scheduledStartTime: data.scheduledStartTime,
    estimatedDurationMin: data.estimatedDurationMin,
    surgeon: data.surgeon,
    assistants: [],
    procedure: data.procedure,
    procedureCpt: data.procedureCpt,
    laterality: data.laterality,
    milestones: [],
    createdAt: now,
    updatedAt: now,
  };
  cases.set(id, orCase);

  if (dbRepo) {
    dbRepo
      .insertOrCase({
        id,
        tenantId: 'default',
        patientDfn: data.patientDfn,
        status: 'scheduled',
        priority: data.priority,
        roomId: data.roomId ?? null,
        scheduledDate: data.scheduledDate,
        scheduledStartTime: data.scheduledStartTime ?? null,
        estimatedDurationMin: data.estimatedDurationMin,
        surgeon: data.surgeon,
        assistants: [],
        procedure: data.procedure,
        procedureCpt: data.procedureCpt ?? null,
        laterality: data.laterality ?? null,
        anesthesiaJson: null,
        milestonesJson: [],
      })
      .catch((e: unknown) => dbWarn('insertOrCase', e));
  }

  return orCase;
}

export function getCase(id: string): OrCase | undefined {
  return cases.get(id);
}

export function listCases(opts?: {
  date?: string;
  status?: OrCaseStatus;
  roomId?: string;
}): OrCase[] {
  let list = Array.from(cases.values());
  if (opts?.date) list = list.filter((c) => c.scheduledDate === opts.date);
  if (opts?.status) list = list.filter((c) => c.status === opts.status);
  if (opts?.roomId) list = list.filter((c) => c.roomId === opts.roomId);
  return list.sort((a, b) =>
    (a.scheduledStartTime || '').localeCompare(b.scheduledStartTime || '')
  );
}

export function updateCaseStatus(id: string, status: OrCaseStatus, recordedBy: string): boolean {
  const c = cases.get(id);
  if (!c) return false;
  const milestone: OrMilestone = { event: status, timestamp: new Date().toISOString(), recordedBy };
  c.milestones.push(milestone);
  c.status = status;
  c.updatedAt = milestone.timestamp;

  // Room state transitions
  if (status === 'in-or' && c.roomId) {
    const room = rooms.get(c.roomId);
    if (room) {
      room.status = 'in-use';
      room.currentCaseId = id;
    }
  }
  if ((status === 'in-pacu' || status === 'completed' || status === 'cancelled') && c.roomId) {
    const room = rooms.get(c.roomId);
    if (room) {
      room.status = 'turnover';
      room.currentCaseId = undefined;
    }
  }

  if (dbRepo) {
    dbRepo
      .updateOrCase(id, { status, milestonesJson: c.milestones })
      .catch((e: unknown) => dbWarn('updateOrCase/status', e));
  }

  return true;
}

// -- Anesthesia -----------------------------------------------------

export function setAnesthesia(caseId: string, record: AnesthesiaRecord): boolean {
  const c = cases.get(caseId);
  if (!c) return false;
  c.anesthesia = record;
  c.updatedAt = new Date().toISOString();

  if (dbRepo) {
    dbRepo
      .updateOrCase(caseId, { anesthesiaJson: record })
      .catch((e: unknown) => dbWarn('updateOrCase/anesthesia', e));
  }

  return true;
}

// -- Blocks ---------------------------------------------------------

export function createBlock(data: Omit<OrBlock, 'id'>): OrBlock {
  const id = `blk-${randomBytes(4).toString('hex')}`;
  const block: OrBlock = { id, ...data };
  blocks.set(id, block);

  if (dbRepo) {
    dbRepo
      .insertOrBlock({
        id,
        tenantId: 'default',
        roomId: data.roomId,
        serviceId: data.serviceId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        surgeon: data.surgeon,
      })
      .catch((e: unknown) => dbWarn('insertOrBlock', e));
  }

  return block;
}

export function listBlocks(roomId?: string): OrBlock[] {
  let list = Array.from(blocks.values());
  if (roomId) list = list.filter((b) => b.roomId === roomId);
  return list;
}

// -- Board Metrics --------------------------------------------------

export function getOrBoardMetrics(): OrBoardMetrics {
  const today = new Date().toISOString().slice(0, 10);
  const todayCases = Array.from(cases.values()).filter((c) => c.scheduledDate === today);

  const completed = todayCases.filter((c) => c.status === 'completed').length;
  const inProgress = todayCases.filter((c) =>
    ['in-or', 'under-anesthesia', 'procedure-start', 'procedure-end', 'closing'].includes(c.status)
  ).length;
  const cancelled = todayCases.filter((c) => c.status === 'cancelled').length;
  const scheduled = todayCases.filter((c) =>
    ['scheduled', 'pre-op', 'in-holding'].includes(c.status)
  ).length;

  const totalRooms = rooms.size;
  const usedRooms = Array.from(rooms.values()).filter((r) => r.status === 'in-use').length;

  const byRoom: OrBoardMetrics['byRoom'] = {};
  for (const r of rooms.values()) {
    byRoom[r.id] = { status: r.status, currentCase: r.currentCaseId };
  }

  return {
    totalCasesToday: todayCases.length,
    completedCases: completed,
    inProgressCases: inProgress,
    scheduledRemaining: scheduled,
    cancelledCases: cancelled,
    avgTurnoverMin: 0,
    roomUtilizationPct: totalRooms > 0 ? Math.round((usedRooms / totalRooms) * 100) : 0,
    onTimeStartPct: 0,
    byRoom,
  };
}
