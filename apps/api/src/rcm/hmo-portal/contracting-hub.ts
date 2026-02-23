/**
 * Contracting Hub — Phase 97B: Payer Contracting Task Management
 *
 * High-level service wrapping the task-repo with contracting-specific
 * business logic: task templates per payer type, progress tracking,
 * and summary dashboards.
 *
 * Uses the existing payerTask table (Phase 95B) — no new DB tables needed.
 */

import {
  listTasks,
  createTask,
  updateTaskStatus,
  findTaskById,
  type TaskRow,
} from "../../platform/db/repo/task-repo.js";
import { PH_HMO_PAYER_TYPES, type PayerTypeClassification } from "./adapter-manifest.js";
import { getPhHmo } from "../payers/ph-hmo-registry.js";

/* ── Contracting task templates ─────────────────────────────── */

export interface ContractingTemplate {
  title: string;
  description: string;
  applicableTo: PayerTypeClassification[];
}

/**
 * Standard contracting tasks for PH HMO onboarding.
 * Applied when a payer is first enrolled for a tenant.
 */
export const CONTRACTING_TASK_TEMPLATES: ContractingTemplate[] = [
  {
    title: "Obtain accreditation application form",
    description: "Request the provider accreditation application form from the HMO. Check website or call provider relations.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Submit accreditation documents",
    description: "Submit DOH license, SEC registration, BIR TIN, professional licenses, and other required documents.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Facility inspection / site visit",
    description: "Coordinate site visit from HMO accreditation team. Ensure facility meets HMO standards.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Negotiate fee schedule / rate card",
    description: "Review and negotiate the HMO's proposed fee schedule for covered services.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Sign provider agreement / MOA",
    description: "Execute the Memorandum of Agreement (MOA) or provider contract.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Obtain provider portal credentials",
    description: "Request portal access credentials for LOA/claims submission. Store credential reference in vault (never in system).",
    applicableTo: ["hmo_l1"],
  },
  {
    title: "Test LOA submission workflow",
    description: "Submit a test LOA request to verify the workflow. Confirm turnaround time and response format.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Test claim submission workflow",
    description: "Submit a test claim to verify the packet format and submission process.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Confirm SOA/remittance cycle",
    description: "Confirm the Statement of Account generation frequency and reconciliation process.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
  {
    title: "Document payer-specific requirements",
    description: "Record any payer-specific claim filing requirements, deadlines, or special forms.",
    applicableTo: ["hmo_l1", "hmo_l3"],
  },
];

/* ── Contracting hub service ────────────────────────────────── */

export interface ContractingSummary {
  payerId: string;
  payerName: string;
  payerType: PayerTypeClassification;
  tasks: TaskRow[];
  progress: {
    total: number;
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
    pct: number;
  };
}

export interface ContractingDashboard {
  generatedAt: string;
  totalPayers: number;
  totalTasks: number;
  byStatus: Record<string, number>;
  payers: ContractingSummary[];
}

/**
 * Initialize contracting tasks for a payer based on its type.
 * Skips tasks that already exist (idempotent).
 */
export function initContractingTasks(
  payerId: string,
  payerName: string,
  tenantId?: string,
  actor?: string,
): { created: number; skipped: number } {
  const payerType = PH_HMO_PAYER_TYPES[payerId] ?? "hmo_l3";
  const existing = listTasks(payerId, tenantId);
  const existingTitles = new Set(existing.map(t => t.title));

  let created = 0;
  let skipped = 0;

  for (const template of CONTRACTING_TASK_TEMPLATES) {
    if (!template.applicableTo.includes(payerType)) {
      continue;
    }
    if (existingTitles.has(template.title)) {
      skipped++;
      continue;
    }
    createTask({
      payerId,
      tenantId: tenantId ?? null,
      title: template.title,
      description: template.description,
    }, actor);
    created++;
  }

  return { created, skipped };
}

/**
 * Get contracting summary for a single payer.
 */
export function getContractingSummary(
  payerId: string,
  payerName: string,
  tenantId?: string,
): ContractingSummary {
  const payerType = PH_HMO_PAYER_TYPES[payerId] ?? "hmo_l3";
  const tasks = listTasks(payerId, tenantId);

  const open = tasks.filter(t => t.status === "open").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const blocked = tasks.filter(t => t.status === "blocked").length;
  const done = tasks.filter(t => t.status === "done").length;
  const total = tasks.length;

  return {
    payerId,
    payerName,
    payerType,
    tasks,
    progress: {
      total,
      open,
      inProgress,
      blocked,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    },
  };
}

/**
 * Get contracting dashboard across all PH HMOs.
 */
export function getContractingDashboard(tenantId?: string): ContractingDashboard {
  const payerIds = Object.keys(PH_HMO_PAYER_TYPES);
  const payers: ContractingSummary[] = [];
  const byStatus: Record<string, number> = {
    open: 0, in_progress: 0, blocked: 0, done: 0,
  };
  let totalTasks = 0;

  for (const payerId of payerIds) {
    // Resolve legal name from PH HMO registry
    const hmo = getPhHmo(payerId);
    const payerName = hmo?.legalName ?? payerId;
    const summary = getContractingSummary(payerId, payerName, tenantId);
    payers.push(summary);
    totalTasks += summary.progress.total;
    byStatus.open += summary.progress.open;
    byStatus.in_progress += summary.progress.inProgress;
    byStatus.blocked += summary.progress.blocked;
    byStatus.done += summary.progress.done;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalPayers: payers.length,
    totalTasks,
    byStatus,
    payers,
  };
}

/**
 * Update a contracting task status.
 * Delegates to task-repo with reason enforcement.
 */
export function updateContractingTask(
  taskId: string,
  status: "open" | "in_progress" | "blocked" | "done",
  reason: string,
  actor?: string,
): TaskRow | null {
  return updateTaskStatus(taskId, status, reason, actor);
}

/**
 * Get a single contracting task by ID.
 */
export function getContractingTask(taskId: string): TaskRow | undefined {
  return findTaskById(taskId);
}
