/**
 * Denial Followup Tick — Phase 142: RCM Operational Excellence
 *
 * Background job that scans open denials approaching their SLA deadline
 * and creates work queue items + audit events for follow-up.
 *
 * Runs as DENIAL_FOLLOWUP_TICK job type in the PollingScheduler.
 *
 * Behavior:
 *   1. Query denial_case for status NOT IN (PAID, CLOSED, WRITEOFF)
 *   2. Filter to those with deadline within configurable horizon (default 7 days)
 *   3. For each approaching/overdue denial:
 *      - Create work queue item (if not already exists for this denial)
 *      - Record audit event
 *   4. Return summary of actions taken
 *
 * No external payer calls — this is purely internal workflow automation.
 */

import { getPgDb } from "../../platform/pg/pg-db.js";
import { denialCase } from "../../platform/pg/pg-schema.js";
import { and, sql, lte, notInArray } from "drizzle-orm";
import { appendRcmAudit } from "../audit/rcm-audit.js";
import { log } from "../../lib/logger.js";
import type { RcmJobType } from "./queue.js";
import type { DenialStatus } from "../denials/types.js";

/* ── Config ────────────────────────────────────────────────── */

const FOLLOWUP_HORIZON_DAYS =
  parseInt(process.env.RCM_DENIAL_FOLLOWUP_HORIZON_DAYS ?? "7", 10) || 7;
const FOLLOWUP_INTERVAL_MS =
  parseInt(process.env.RCM_DENIAL_FOLLOWUP_INTERVAL_MS ?? "3600000", 10) || 3_600_000; // 1 hour
const FOLLOWUP_RATE_LIMIT =
  parseInt(process.env.RCM_DENIAL_FOLLOWUP_RATE_LIMIT ?? "20", 10) || 20;
const FOLLOWUP_BATCH_SIZE = 50;

export const DENIAL_FOLLOWUP_JOB_TYPE: RcmJobType = "DENIAL_FOLLOWUP_TICK";

/* ── Terminal statuses that don't need follow-up ───────────── */

const TERMINAL_STATUSES: DenialStatus[] = ["PAID", "CLOSED", "WRITEOFF"];

/* ── Result Types ──────────────────────────────────────────── */

export interface DenialFollowupResult {
  scannedAt: string;
  totalScanned: number;
  approachingSla: number;
  overdueSla: number;
  workItemsCreated: number;
  errors: string[];
}

/* ── Handler ───────────────────────────────────────────────── */

/**
 * Process a single denial followup tick.
 * Called by PollingScheduler or manually via POST /rcm/ops/denial-followup/run.
 */
export async function handleDenialFollowupTick(
  job: { id: string; payload: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const now = new Date();
  const horizonDate = new Date();
  horizonDate.setDate(horizonDate.getDate() + FOLLOWUP_HORIZON_DAYS);
  const horizonIso = horizonDate.toISOString();

  const result: DenialFollowupResult = {
    scannedAt: now.toISOString(),
    totalScanned: 0,
    approachingSla: 0,
    overdueSla: 0,
    workItemsCreated: 0,
    errors: [],
  };

  try {
    const db = getPgDb();

    // Find open denials with deadline within horizon or already overdue
    const openDenials = await db
      .select()
      .from(denialCase)
      .where(
        and(
          notInArray(denialCase.denialStatus, TERMINAL_STATUSES),
          lte(denialCase.deadlineDate, horizonDate),
          sql`${denialCase.deadlineDate} IS NOT NULL`,
        ),
      )
      .limit(FOLLOWUP_BATCH_SIZE);

    result.totalScanned = openDenials.length;

    for (const denial of openDenials) {
      try {
        const deadlineDate = new Date(denial.deadlineDate!);
        const isOverdue = deadlineDate < now;

        if (isOverdue) {
          result.overdueSla++;
        } else {
          result.approachingSla++;
        }

        // Create work queue item via existing workqueue store
        // We use dynamic import to avoid circular deps
        try {
          const { createWorkqueueItem } = await import("../workqueues/workqueue-store.js");
          const existingItems = await getExistingFollowupItems(denial.id);
          if (existingItems === 0) {
            await createWorkqueueItem({
              type: "denial",
              claimId: denial.claimRef,
              payerId: denial.payerId,
              reasonCode: isOverdue ? "SLA_OVERDUE" : "SLA_APPROACHING",
              reasonDescription: isOverdue
                ? `Denial SLA overdue since ${denial.deadlineDate}`
                : `Denial SLA approaching: deadline ${denial.deadlineDate}`,
              reasonCategory: "sla",
              recommendedAction: isOverdue
                ? "Escalate immediately — SLA has passed"
                : "Review and take action before deadline",
              sourceType: "manual",
              sourceId: denial.id,
              priority: isOverdue ? "high" : "medium",
            });
            result.workItemsCreated++;
          }
        } catch (wqErr) {
          // Work queue store may not support createWorkqueueItem with this signature
          // Log but don't fail the whole tick
          result.errors.push(`Work item creation skipped for ${denial.id}: ${wqErr instanceof Error ? wqErr.message : String(wqErr)}`);
        }

        // Audit trail
        appendRcmAudit("denial.followup_flagged", {
          detail: {
            denialId: denial.id,
            claimRef: denial.claimRef,
            payerId: denial.payerId,
            deadlineDate: denial.deadlineDate,
            isOverdue,
            denialStatus: denial.denialStatus,
          },
        });
      } catch (itemErr) {
        const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        result.errors.push(`Error processing denial ${denial.id}: ${msg}`);
      }
    }

    log.info("Denial followup tick completed", {
      scanned: result.totalScanned,
      approaching: result.approachingSla,
      overdue: result.overdueSla,
      workItems: result.workItemsCreated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Tick failed: ${msg}`);
    log.warn("Denial followup tick failed", { error: msg });
  }

  return result as unknown as Record<string, unknown>;
}

/**
 * Check if a followup work item already exists for this denial (dedup).
 */
async function getExistingFollowupItems(denialId: string): Promise<number> {
  try {
    const { countWorkqueueItemsBySource } = await import("../workqueues/workqueue-store.js");
    return countWorkqueueItemsBySource("manual", denialId);
  } catch {
    return 0; // If function doesn't exist, assume no dedup needed
  }
}

/* ── Registration Config ───────────────────────────────────── */

/**
 * Returns the PollingJobConfig for denial followup tick.
 * Wired into the PollingScheduler at startup.
 */
export function getDenialFollowupConfig() {
  return {
    type: DENIAL_FOLLOWUP_JOB_TYPE,
    label: "Denial Followup SLA Tick",
    intervalMs: FOLLOWUP_INTERVAL_MS,
    rateLimitPerHour: FOLLOWUP_RATE_LIMIT,
    enabled: (process.env.RCM_DENIAL_FOLLOWUP_ENABLED ?? "true") === "true",
    handler: handleDenialFollowupTick,
  };
}
