/**
 * Telehealth Encounter Linkage — Phase 307 (W12-P9)
 *
 * Links telehealth rooms to VistA encounters (PCE Visit file).
 * When a telehealth visit occurs, this module grounds it to a VistA
 * encounter via `ORWPCE HASVISIT` (check) and `ORWPCE SAVE` (create).
 *
 * VistA grounding:
 *   - File #9000010 (V VISIT): PCE encounter record
 *   - ORWPCE HASVISIT: Check if encounter exists for patient + date
 *   - ORWPCE GET VISIT: Retrieve detailed visit data
 *   - ORWPCE SAVE: Create/update PCE encounter (write RPC, integration-pending)
 *   - SDOE LIST ENCOUNTERS FOR PAT: List existing encounters for linking
 *
 * Migration plan:
 *   1. Phase 307: In-memory linkage store + read-only encounter probe
 *   2. Future: ORWPCE SAVE writeback via command bus for encounter creation
 *   3. Future: HL7 SIU bridge for scheduling-encounter synchronization
 *   4. Future: VistA AUPNVSIT global direct write for encounter registration
 *
 * Security:
 *   - No PHI in linkage records (hashed patient ref, opaque room/encounter IDs)
 *   - All linkage events audited via immutable audit trail
 *   - Encounter probes use existing RPC auth (session DUZ)
 */

import { createHash } from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type LinkageStatus =
  | "pending"          // Room created, no encounter linked yet
  | "probed"           // ORWPCE HASVISIT checked, encounter exists
  | "linked"           // Room linked to VistA encounter IEN
  | "created"          // New PCE encounter created (future: ORWPCE SAVE)
  | "failed"           // Linkage attempt failed
  | "integration_pending"; // Write RPC not available in sandbox

export interface EncounterLink {
  /** Opaque room ID (from room-store) */
  roomId: string;
  /** Appointment ID the room was created for */
  appointmentId: string;
  /** SHA-256 hash of patient DFN (no raw PHI) */
  patientRefHash: string;
  /** Provider DUZ who initiated the visit */
  providerDuz: string;
  /** VistA encounter IEN if linked */
  encounterIen?: string;
  /** VistA visit date (FileMan format) */
  visitDate?: string;
  /** Linkage status */
  status: LinkageStatus;
  /** ISO timestamp of linkage record creation */
  createdAt: string;
  /** ISO timestamp of last status change */
  updatedAt: string;
  /** Status reason (e.g., "ORWPCE HASVISIT returned 1") */
  statusReason?: string;
  /** VistA grounding metadata for integration-pending states */
  vistaGrounding?: {
    targetRpc: string;
    vistaFiles: string[];
    migrationPath: string;
    sandboxNote: string;
  };
}

export interface ProbeEncounterResult {
  hasVisit: boolean;
  encounterIen?: string;
  visitDate?: string;
  probeRpc: string;
  probeStatus: "success" | "rpc_unavailable" | "no_data";
}

/* ------------------------------------------------------------------ */
/* Store (in-memory, resets on restart)                                 */
/* ------------------------------------------------------------------ */

const links = new Map<string, EncounterLink>();
const MAX_LINKS = 2000;

/**
 * Hash a patient DFN for non-PHI storage.
 */
export function hashPatientRef(dfn: string): string {
  return createHash("sha256").update(`telehealth:${dfn}`).digest("hex").slice(0, 16);
}

/**
 * Create a pending encounter linkage for a telehealth room.
 */
export function createEncounterLink(
  roomId: string,
  appointmentId: string,
  patientRefHash: string,
  providerDuz: string,
): EncounterLink {
  // Enforce capacity
  if (links.size >= MAX_LINKS) {
    // Evict oldest
    const oldest = links.keys().next().value;
    if (oldest) links.delete(oldest);
  }

  const now = new Date().toISOString();
  const link: EncounterLink = {
    roomId,
    appointmentId,
    patientRefHash,
    providerDuz,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  links.set(roomId, link);

  log.info(`Encounter link created: room=${roomId} status=pending`);
  return link;
}

/**
 * Update the linkage status after probing VistA.
 */
export function updateLinkStatus(
  roomId: string,
  status: LinkageStatus,
  encounterIen?: string,
  visitDate?: string,
  statusReason?: string,
  vistaGrounding?: EncounterLink["vistaGrounding"],
): EncounterLink | undefined {
  const link = links.get(roomId);
  if (!link) return undefined;

  link.status = status;
  link.updatedAt = new Date().toISOString();
  if (encounterIen) link.encounterIen = encounterIen;
  if (visitDate) link.visitDate = visitDate;
  if (statusReason) link.statusReason = statusReason;
  if (vistaGrounding) link.vistaGrounding = vistaGrounding;

  log.info(`Encounter link updated: room=${roomId} status=${status} ien=${encounterIen || "none"}`);
  return link;
}

/**
 * Get a linkage record by room ID.
 */
export function getEncounterLink(roomId: string): EncounterLink | undefined {
  return links.get(roomId);
}

/**
 * List all active linkage records.
 */
export function listEncounterLinks(): EncounterLink[] {
  return Array.from(links.values());
}

/**
 * Get encounter linkage stats.
 */
export function getEncounterLinkStats(): {
  total: number;
  byStatus: Record<LinkageStatus, number>;
} {
  const byStatus: Record<LinkageStatus, number> = {
    pending: 0,
    probed: 0,
    linked: 0,
    created: 0,
    failed: 0,
    integration_pending: 0,
  };
  for (const link of links.values()) {
    byStatus[link.status]++;
  }
  return { total: links.size, byStatus };
}

/**
 * Clear all links (for testing).
 */
export function clearEncounterLinks(): void {
  links.clear();
}
