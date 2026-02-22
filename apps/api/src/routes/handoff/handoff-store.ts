/**
 * Phase 86 — Shift Handoff In-Memory Store.
 *
 * Follows the imaging-worklist pattern (Phase 23): Map<>-based in-memory store
 * that resets on API restart. This is intentional — CRHD RPCs are not available
 * in the WorldVistA Docker sandbox.
 *
 * Migration path:
 *   1. Install CRHD (Shift Handoff Tool) package in VistA
 *   2. Replace in-memory store with CRHD RPC calls:
 *      - CRHD GET PAT LIST for patient assembly
 *      - CRHD HOT TEAM SAVE for team/shift persistence
 *      - TIU CREATE RECORD for handoff notes as TIU documents
 *   3. OR persist as custom TIU document class "SHIFT HANDOFF NOTE"
 *   4. OR use MailMan bulletin for shift-to-shift notifications
 */

import { randomBytes } from "crypto";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface SbarNote {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "normal" | "high" | "urgent";
}

export interface RiskFlag {
  type: "falls" | "isolation" | "critical-labs" | "code-status" | "restraints" | "suicide-precautions" | "other";
  label: string;
  active: boolean;
  note?: string;
}

export interface PatientHandoff {
  dfn: string;
  patientName: string;
  roomBed: string;
  sbar: SbarNote;
  todos: TodoItem[];
  riskFlags: RiskFlag[];
  /** Free-text nursing notes for this patient during shift */
  nursingNotes: string;
}

export interface HandoffReport {
  id: string;
  /** Ward or service (e.g., "3EAST", "SURG-ICU") */
  ward: string;
  /** Shift label (e.g., "Day 0700-1900", "Night 1900-0700") */
  shiftLabel: string;
  /** ISO timestamp of shift start */
  shiftStart: string;
  /** ISO timestamp of shift end */
  shiftEnd: string;
  /** Outgoing staff who created the handoff */
  createdBy: { duz: string; name: string };
  /** Incoming staff who accepted the handoff (null until accepted) */
  acceptedBy: { duz: string; name: string } | null;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** ISO timestamp of acceptance (null until accepted) */
  acceptedAt: string | null;
  /** Status lifecycle */
  status: "draft" | "submitted" | "accepted" | "archived";
  /** Per-patient handoff data */
  patients: PatientHandoff[];
  /** Global shift notes (not patient-specific) */
  shiftNotes: string;
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const handoffStore = new Map<string, HandoffReport>();

/** Generate a unique handoff ID */
function generateId(): string {
  return `hoff-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function generateTodoId(): string {
  return `todo-${randomBytes(4).toString("hex")}`;
}

/* ------------------------------------------------------------------ */
/* CRUD operations                                                      */
/* ------------------------------------------------------------------ */

export function createHandoffReport(input: {
  ward: string;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  createdBy: { duz: string; name: string };
  patients?: PatientHandoff[];
  shiftNotes?: string;
}): HandoffReport {
  const now = new Date().toISOString();
  const report: HandoffReport = {
    id: generateId(),
    ward: input.ward,
    shiftLabel: input.shiftLabel,
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    createdBy: input.createdBy,
    acceptedBy: null,
    createdAt: now,
    updatedAt: now,
    acceptedAt: null,
    status: "draft",
    patients: (input.patients || []).map(p => ({
      ...p,
      todos: p.todos.map(t => ({ ...t, id: t.id || generateTodoId() })),
    })),
    shiftNotes: input.shiftNotes || "",
  };
  handoffStore.set(report.id, report);
  return report;
}

export function getHandoffReport(id: string): HandoffReport | undefined {
  return handoffStore.get(id);
}

export function listHandoffReports(filters?: {
  ward?: string;
  status?: string;
  createdByDuz?: string;
}): HandoffReport[] {
  let reports = [...handoffStore.values()];
  if (filters?.ward) {
    const w = filters.ward.toUpperCase();
    reports = reports.filter(r => r.ward.toUpperCase() === w);
  }
  if (filters?.status) {
    reports = reports.filter(r => r.status === filters.status);
  }
  if (filters?.createdByDuz) {
    reports = reports.filter(r => r.createdBy.duz === filters.createdByDuz);
  }
  // Most recent first
  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return reports;
}

export function updateHandoffReport(
  id: string,
  updates: Partial<Pick<HandoffReport, "patients" | "shiftNotes" | "shiftLabel" | "status">>,
): HandoffReport | undefined {
  const report = handoffStore.get(id);
  if (!report) return undefined;
  // Only draft/submitted can be updated
  if (report.status === "archived") return undefined;

  const updated: HandoffReport = {
    ...report,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  // Ensure todo IDs exist
  if (updated.patients) {
    updated.patients = updated.patients.map(p => ({
      ...p,
      todos: p.todos.map(t => ({ ...t, id: t.id || generateTodoId() })),
    }));
  }
  handoffStore.set(id, updated);
  return updated;
}

export function submitHandoffReport(id: string): HandoffReport | undefined {
  const report = handoffStore.get(id);
  if (!report || report.status !== "draft") return undefined;
  const updated: HandoffReport = {
    ...report,
    status: "submitted",
    updatedAt: new Date().toISOString(),
  };
  handoffStore.set(id, updated);
  return updated;
}

export function acceptHandoffReport(
  id: string,
  acceptedBy: { duz: string; name: string },
): HandoffReport | undefined {
  const report = handoffStore.get(id);
  if (!report || report.status !== "submitted") return undefined;
  const now = new Date().toISOString();
  const updated: HandoffReport = {
    ...report,
    status: "accepted",
    acceptedBy,
    acceptedAt: now,
    updatedAt: now,
  };
  handoffStore.set(id, updated);
  return updated;
}

export function archiveHandoffReport(id: string): HandoffReport | undefined {
  const report = handoffStore.get(id);
  if (!report || report.status === "archived") return undefined;
  const updated: HandoffReport = {
    ...report,
    status: "archived",
    updatedAt: new Date().toISOString(),
  };
  handoffStore.set(id, updated);
  return updated;
}

export function getStoreStats(): { total: number; byStatus: Record<string, number> } {
  const byStatus: Record<string, number> = { draft: 0, submitted: 0, accepted: 0, archived: 0 };
  for (const r of handoffStore.values()) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  return { total: handoffStore.size, byStatus };
}
