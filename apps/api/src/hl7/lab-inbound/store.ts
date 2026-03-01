/**
 * Lab Inbound Staging Store — Phase 433 (W27 P3)
 *
 * In-memory store for staging inbound lab results (ORU^R01) before
 * VistA filing. Follows the established in-memory store pattern
 * (imaging-worklist Phase 23, claim-store Phase 38).
 *
 * Migration path: When LR package RPCs are available, results will
 * be filed directly to VistA File 63 (LAB DATA). Until then, this
 * store provides visibility and manual reconciliation.
 */

import type { InboundLabResult, LabFilingStatus, LabValidationResult } from "./types.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const labStore = new Map<string, InboundLabResult>();
const MAX_STORE_SIZE = 5000;

/* ------------------------------------------------------------------ */
/* ID Generation                                                       */
/* ------------------------------------------------------------------ */

let dailyCounter = 0;
let lastCounterDate = "";

function generateLabId(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (today !== lastCounterDate) {
    dailyCounter = 0;
    lastCounterDate = today;
  }
  dailyCounter++;
  return `LR-${today}-${String(dailyCounter).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ */
/* CRUD Operations                                                     */
/* ------------------------------------------------------------------ */

/** Stage a new inbound lab result. Returns the generated ID. */
export function stageLabResult(result: Omit<InboundLabResult, "id">): string {
  if (labStore.size >= MAX_STORE_SIZE) {
    // Evict oldest received result
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [key, val] of labStore) {
      const t = new Date(val.receivedAt).getTime();
      if (t < oldestTime) { oldestTime = t; oldestKey = key; }
    }
    if (oldestKey) labStore.delete(oldestKey);
  }

  const id = generateLabId();
  labStore.set(id, { ...result, id } as InboundLabResult);
  log.info("Lab result staged", { id, filler: result.fillerOrderNumber, status: result.status });
  return id;
}

/** Get a staged lab result by ID. */
export function getLabResult(id: string): InboundLabResult | undefined {
  return labStore.get(id);
}

/** List all staged results, optionally filtered. */
export function listLabResults(filter?: {
  status?: LabFilingStatus;
  matchedDfn?: string;
  sendingFacility?: string;
  limit?: number;
}): InboundLabResult[] {
  let results = Array.from(labStore.values());

  if (filter?.status) results = results.filter(r => r.status === filter.status);
  if (filter?.matchedDfn) results = results.filter(r => r.matchedDfn === filter.matchedDfn);
  if (filter?.sendingFacility) results = results.filter(r => r.sendingFacility === filter.sendingFacility);

  // Sort newest first
  results.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  if (filter?.limit && filter.limit > 0) results = results.slice(0, filter.limit);
  return results;
}

/** Update the status of a staged result. */
export function updateLabStatus(id: string, status: LabFilingStatus, detail?: Partial<InboundLabResult>): boolean {
  const existing = labStore.get(id);
  if (!existing) return false;

  existing.status = status;
  if (detail) Object.assign(existing, detail);

  if (status === "validated") existing.validatedAt = new Date().toISOString();
  if (status === "filed") existing.filedAt = new Date().toISOString();

  log.info("Lab result status updated", { id, status });
  return true;
}

/** Get quarantined (unmatched / failed) results. */
export function getQuarantinedResults(): InboundLabResult[] {
  return listLabResults({ status: "quarantined" });
}

/** Link an unmatched result to a patient DFN. */
export function linkLabToPatient(id: string, dfn: string): boolean {
  const existing = labStore.get(id);
  if (!existing) return false;

  existing.matchedDfn = dfn;
  if (existing.status === "quarantined") existing.status = "validated";
  log.info("Lab result linked to patient", { id, dfn });
  return true;
}

/** Store statistics. */
export function getLabStoreStats(): {
  total: number;
  byStatus: Record<string, number>;
  maxSize: number;
} {
  const byStatus: Record<string, number> = {};
  for (const r of labStore.values()) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  return { total: labStore.size, byStatus, maxSize: MAX_STORE_SIZE };
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/** Validate an inbound lab result before staging. */
export function validateLabResult(result: Omit<InboundLabResult, "id">): LabValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.fillerOrderNumber) errors.push("Missing filler order number (OBR-3)");
  if (!result.universalServiceId) errors.push("Missing universal service ID (OBR-4)");
  if (!result.messageControlId) errors.push("Missing message control ID (MSH-10)");
  if (!result.sendingApp) errors.push("Missing sending application (MSH-3)");
  if (!result.patientExternalId) errors.push("Missing patient external ID (PID-3)");
  if (!result.results || result.results.length === 0) errors.push("No observation results (OBX segments)");

  if (!result.matchedDfn) warnings.push("No matched VistA DFN — will be quarantined");
  if (!result.accessionNumber) warnings.push("No accession number (OBR-20) — may complicate VistA filing");
  if (!result.specimen) warnings.push("No specimen information");
  if (result.resultStatus === "P") warnings.push("Preliminary result — may be updated");

  for (const obs of result.results || []) {
    if (!obs.observationId) errors.push(`OBX set ${obs.setId}: Missing observation ID (OBX-3)`);
    if (!obs.value && obs.resultStatus !== "X") warnings.push(`OBX set ${obs.setId}: Empty value`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/* ------------------------------------------------------------------ */
/* Reset (for tests)                                                   */
/* ------------------------------------------------------------------ */

/** @internal — reset store for testing */
export function _resetLabStore(): void {
  labStore.clear();
  dailyCounter = 0;
  lastCounterDate = "";
}
