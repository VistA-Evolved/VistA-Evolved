/**
 * migration-store.ts -- In-memory Migration Job Store (Phase 50)
 *
 * Stores migration jobs, templates, and rollback plans.
 * Same in-memory pattern as imaging-worklist (Phase 23) and claim-store (Phase 38).
 * Resets on API restart -- intentional for sandbox.
 *
 * Migration path: VistA FileMan files or external persistence when needed.
 */

import { randomBytes } from "node:crypto";
import type {
  MigrationJob,
  MigrationJobStatus,
  MappingTemplate,
  RollbackPlan,
  ImportEntityType,
  MigrationDirection,
} from "./types.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Stores                                                              */
/* ------------------------------------------------------------------ */

const jobStore = new Map<string, MigrationJob>();
const templateStore = new Map<string, MappingTemplate>();
const rollbackStore = new Map<string, RollbackPlan>();

/** Max jobs retained in memory */
const MAX_JOBS = 500;

/* ------------------------------------------------------------------ */
/* Job CRUD                                                            */
/* ------------------------------------------------------------------ */

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

export function createJob(params: {
  direction: MigrationDirection;
  entityType?: ImportEntityType;
  bundleType?: MigrationJob["bundleType"];
  sourceFormat?: MigrationJob["sourceFormat"];
  templateId?: string;
  createdBy: string;
  createdByName: string;
  fileName?: string;
  rawData?: string;
}): MigrationJob {
  // Evict oldest if at capacity
  if (jobStore.size >= MAX_JOBS) {
    const oldest = [...jobStore.entries()]
      .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt))[0];
    if (oldest) jobStore.delete(oldest[0]);
  }

  const now = new Date().toISOString();
  const job: MigrationJob = {
    id: generateId("mig"),
    direction: params.direction,
    status: "created",
    entityType: params.entityType,
    bundleType: params.bundleType,
    sourceFormat: params.sourceFormat,
    templateId: params.templateId,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: now,
    updatedAt: now,
    fileName: params.fileName,
    rawData: params.rawData,
  };

  jobStore.set(job.id, job);
  log.info("Migration job created", { jobId: job.id, direction: job.direction, entityType: job.entityType });
  return job;
}

export function getJob(id: string): MigrationJob | undefined {
  return jobStore.get(id);
}

export function updateJob(id: string, updates: Partial<MigrationJob>): MigrationJob | undefined {
  const job = jobStore.get(id);
  if (!job) return undefined;

  const updated = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  jobStore.set(id, updated);
  return updated;
}

export function listJobs(filter?: {
  direction?: MigrationDirection;
  status?: MigrationJobStatus;
  entityType?: ImportEntityType;
}): MigrationJob[] {
  let jobs = [...jobStore.values()];

  if (filter?.direction) jobs = jobs.filter((j) => j.direction === filter.direction);
  if (filter?.status) jobs = jobs.filter((j) => j.status === filter.status);
  if (filter?.entityType) jobs = jobs.filter((j) => j.entityType === filter.entityType);

  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteJob(id: string): boolean {
  return jobStore.delete(id);
}

/* ------------------------------------------------------------------ */
/* Status transitions (FSM)                                            */
/* ------------------------------------------------------------------ */

const VALID_TRANSITIONS: Record<MigrationJobStatus, MigrationJobStatus[]> = {
  created: ["validating"],
  validating: ["validated", "validation-failed"],
  validated: ["dry-run", "importing", "exporting"],
  "validation-failed": ["validating"], // retry
  "dry-run": ["dry-run-complete"],
  "dry-run-complete": ["importing", "created"], // proceed or restart
  importing: ["imported", "import-failed"],
  imported: ["rolled-back"],
  "import-failed": ["created"], // retry from scratch
  exporting: ["exported", "export-failed"],
  exported: [],
  "export-failed": ["created"],
  "rolled-back": [],
};

export function transitionJob(
  id: string,
  newStatus: MigrationJobStatus,
): { ok: boolean; job?: MigrationJob; error?: string } {
  const job = jobStore.get(id);
  if (!job) return { ok: false, error: "Job not found" };

  const allowed = VALID_TRANSITIONS[job.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from '${job.status}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "none"}`,
    };
  }

  const updated = updateJob(id, { status: newStatus });
  return { ok: true, job: updated };
}

/* ------------------------------------------------------------------ */
/* Template CRUD                                                       */
/* ------------------------------------------------------------------ */

export function registerTemplate(template: MappingTemplate): void {
  templateStore.set(template.id, template);
  log.info("Mapping template registered", { id: template.id, name: template.name });
}

export function getTemplate(id: string): MappingTemplate | undefined {
  return templateStore.get(id);
}

export function listTemplates(): MappingTemplate[] {
  return [...templateStore.values()];
}

export function deleteTemplate(id: string): boolean {
  return templateStore.delete(id);
}

/* ------------------------------------------------------------------ */
/* Rollback plans                                                      */
/* ------------------------------------------------------------------ */

export function saveRollbackPlan(plan: RollbackPlan): void {
  rollbackStore.set(plan.jobId, plan);
}

export function getRollbackPlan(jobId: string): RollbackPlan | undefined {
  return rollbackStore.get(jobId);
}

export function deleteRollbackPlan(jobId: string): boolean {
  return rollbackStore.delete(jobId);
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export function getMigrationStats(): {
  totalJobs: number;
  byStatus: Record<string, number>;
  byDirection: Record<string, number>;
  templateCount: number;
} {
  const byStatus: Record<string, number> = {};
  const byDirection: Record<string, number> = {};

  for (const job of jobStore.values()) {
    byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
    byDirection[job.direction] = (byDirection[job.direction] ?? 0) + 1;
  }

  return {
    totalJobs: jobStore.size,
    byStatus,
    byDirection,
    templateCount: templateStore.size,
  };
}
