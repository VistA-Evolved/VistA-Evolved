/**
 * apps/api/src/service-lines/ed/ed-store.ts
 *
 * Phase 464 (W31-P1). In-memory ED tracking store.
 * Manages ED visits, beds, and board metrics.
 */

import { randomBytes } from "crypto";
import type {
  EdVisit,
  EdVisitStatus,
  EdBed,
  BedAssignment,
  TriageAssessment,
  EdDisposition,
  EdBoardMetrics,
} from "./types.js";

// ── Stores ─────────────────────────────────────────────────────────

const visits = new Map<string, EdVisit>();
const beds = new Map<string, EdBed>();

// ── Seed default beds ──────────────────────────────────────────────

function seedBeds() {
  const zones = [
    { zone: "trauma", prefix: "T", count: 4 },
    { zone: "acute", prefix: "A", count: 12 },
    { zone: "fast-track", prefix: "FT", count: 6 },
    { zone: "hallway", prefix: "H", count: 4 },
  ];
  for (const z of zones) {
    for (let i = 1; i <= z.count; i++) {
      const id = `${z.prefix}${i}`;
      beds.set(id, {
        id, zone: z.zone, bedNumber: `${z.prefix}-${i}`,
        status: "available",
      });
    }
  }
}
seedBeds();

// ── Visit CRUD ─────────────────────────────────────────────────────

export function createVisit(
  patientDfn: string,
  arrivalMode: EdVisit["arrivalMode"],
  createdBy: string
): EdVisit {
  const id = `ed-${randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const visit: EdVisit = {
    id,
    patientDfn,
    status: "waiting",
    arrivalTime: now,
    arrivalMode,
    createdAt: now,
    updatedAt: now,
  };
  visits.set(id, visit);
  return visit;
}

export function getVisit(id: string): EdVisit | undefined {
  return visits.get(id);
}

export function listVisits(status?: EdVisitStatus): EdVisit[] {
  let list = Array.from(visits.values());
  if (status) list = list.filter((v) => v.status === status);
  return list.sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime());
}

export function updateVisitStatus(id: string, status: EdVisitStatus): boolean {
  const visit = visits.get(id);
  if (!visit) return false;
  visit.status = status;
  visit.updatedAt = new Date().toISOString();
  return true;
}

// ── Triage ─────────────────────────────────────────────────────────

export function triageVisit(id: string, triage: TriageAssessment): boolean {
  const visit = visits.get(id);
  if (!visit) return false;
  visit.triage = triage;
  visit.status = "triaged";
  visit.updatedAt = new Date().toISOString();
  return true;
}

// ── Bed Assignment ─────────────────────────────────────────────────

export function assignBed(visitId: string, bedId: string, assignedBy: string): boolean {
  const visit = visits.get(visitId);
  const bed = beds.get(bedId);
  if (!visit || !bed || bed.status !== "available") return false;

  const assignment: BedAssignment = {
    bedId, visitId, assignedAt: new Date().toISOString(), assignedBy,
  };
  visit.bedAssignment = assignment;
  visit.status = "bedded";
  visit.updatedAt = new Date().toISOString();

  bed.status = "occupied";
  bed.currentVisitId = visitId;
  return true;
}

export function releaseBed(visitId: string): boolean {
  const visit = visits.get(visitId);
  if (!visit || !visit.bedAssignment) return false;

  const bed = beds.get(visit.bedAssignment.bedId);
  if (bed) {
    bed.status = "cleaning";
    bed.currentVisitId = undefined;
  }

  visit.bedAssignment.releasedAt = new Date().toISOString();
  return true;
}

export function listBeds(): EdBed[] {
  return Array.from(beds.values());
}

// ── Disposition ────────────────────────────────────────────────────

export function disposeVisit(
  id: string,
  disposition: EdDisposition,
  dispositionBy: string
): boolean {
  const visit = visits.get(id);
  if (!visit) return false;

  visit.disposition = disposition;
  visit.dispositionBy = dispositionBy;
  visit.dispositionTime = new Date().toISOString();
  visit.updatedAt = visit.dispositionTime;

  // Set final status
  if (disposition.startsWith("admit")) visit.status = "admitted";
  else if (disposition === "discharge-home") visit.status = "discharged";
  else if (disposition === "transfer-out") visit.status = "transferred";
  else if (disposition === "left-ama") visit.status = "left-ama";
  else if (disposition === "lwbs") visit.status = "lwbs";
  else if (disposition === "expired") visit.status = "expired";

  // Calculate time metrics
  const arrivalMs = new Date(visit.arrivalTime).getTime();
  const dispMs = new Date(visit.dispositionTime).getTime();
  visit.totalMinutes = Math.round((dispMs - arrivalMs) / 60000);
  visit.doorToDispositionMinutes = visit.totalMinutes;

  // Release bed
  if (visit.bedAssignment) releaseBed(id);

  return true;
}

// ── Board Metrics ──────────────────────────────────────────────────

export function getBoardMetrics(): EdBoardMetrics {
  const all = Array.from(visits.values());
  const active = all.filter((v) =>
    !["discharged", "transferred", "left-ama", "lwbs", "expired"].includes(v.status)
  );

  const waiting = active.filter((v) => v.status === "waiting").length;
  const bedded = active.filter((v) => v.bedAssignment && !v.bedAssignment.releasedAt).length;
  const pendingAdmit = active.filter((v) => v.status === "admitted" || v.status === "pending-disposition").length;

  const totalBeds = beds.size;
  const occupiedBeds = Array.from(beds.values()).filter((b) => b.status === "occupied").length;

  // Average wait time (for patients who got triaged)
  const triagedVisits = all.filter((v) => v.triage);
  const avgWait = triagedVisits.length > 0
    ? triagedVisits.reduce((sum, v) => {
        const arrival = new Date(v.arrivalTime).getTime();
        const triage = new Date(v.triage!.triageTime).getTime();
        return sum + (triage - arrival) / 60000;
      }, 0) / triagedVisits.length
    : 0;

  // Average LOS (for disposed visits)
  const disposed = all.filter((v) => v.totalMinutes !== undefined);
  const avgLos = disposed.length > 0
    ? disposed.reduce((s, v) => s + (v.totalMinutes || 0), 0) / disposed.length
    : 0;

  const lwbsCount = all.filter((v) => v.status === "lwbs").length;
  const lwbsRate = all.length > 0 ? (lwbsCount / all.length) * 100 : 0;

  const byAcuity: Record<string, number> = {};
  for (const v of active) {
    const level = v.triage?.level ? `ESI-${v.triage.level}` : "untriaged";
    byAcuity[level] = (byAcuity[level] || 0) + 1;
  }

  return {
    totalVisits: all.length,
    waitingCount: waiting,
    beddedCount: bedded,
    pendingAdmitCount: pendingAdmit,
    avgWaitMinutes: Math.round(avgWait),
    avgLosMinutes: Math.round(avgLos),
    lwbsRate: Math.round(lwbsRate * 10) / 10,
    bedOccupancyPct: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    byAcuity,
  };
}
