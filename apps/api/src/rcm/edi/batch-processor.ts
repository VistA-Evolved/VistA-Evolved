/**
 * RCM — Batch Claim Processor
 *
 * Phase 242 (Wave 6 P5): Groups claims by payer/connector and submits
 * them through the resilient connector pipeline in configurable batches.
 *
 * Design:
 *   - Claims are queued via submitBatch()
 *   - Processing groups by connector (payer integration mode)
 *   - Each claim goes through resilientConnectorCall() for retry/CB
 *   - Results tracked per batch with per-claim outcome
 *   - In-memory store (matches project pattern)
 */

import * as crypto from "node:crypto";
import { log } from "../../lib/logger.js";
import { getClaim, listClaims } from "../domain/claim-store.js";
import { getConnectorForMode, type RcmConnector } from "../connectors/types.js";
import { resilientConnectorCall } from "../connectors/connector-resilience.js";
import { buildClaim837FromDomain, advancePipelineStage, createPipelineEntry } from "../edi/pipeline.js";
import { serialize837 } from "../edi/x12-serializer.js";
import type { Claim } from "../domain/claim.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BatchSubmitRequest {
  /** Claim IDs to submit */
  claimIds: string[];
  /** Optional: max concurrent submissions per connector */
  concurrency?: number;
  /** Optional: tenant ID for filtering */
  tenantId?: string;
}

export interface BatchClaimResult {
  claimId: string;
  ok: boolean;
  transactionId?: string;
  error?: string;
  durationMs: number;
}

export interface BatchStatus {
  batchId: string;
  status: "queued" | "processing" | "completed" | "failed";
  totalClaims: number;
  processed: number;
  succeeded: number;
  failed: number;
  results: BatchClaimResult[];
  startedAt: number;
  completedAt?: number;
}

/* ------------------------------------------------------------------ */
/*  In-Memory Store                                                    */
/* ------------------------------------------------------------------ */

const batches = new Map<string, BatchStatus>();
const MAX_BATCH_SIZE = Number(process.env.RCM_MAX_BATCH_SIZE ?? 100);
const MAX_BATCH_CONCURRENCY = Number(process.env.RCM_BATCH_CONCURRENCY ?? 5);
const MAX_BATCHES = 200;

/* ------------------------------------------------------------------ */
/*  Batch Processing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Queue a batch of claims for submission.
 * Returns a batch ID for tracking.
 */
export function submitBatch(request: BatchSubmitRequest): BatchStatus {
  const batchId = `batch-${crypto.randomBytes(6).toString("hex")}`;
  const claimIds = request.claimIds.slice(0, MAX_BATCH_SIZE);

  const batch: BatchStatus = {
    batchId,
    status: "queued",
    totalClaims: claimIds.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    results: [],
    startedAt: Date.now(),
  };

  // FIFO eviction
  if (batches.size >= MAX_BATCHES) {
    const oldestKey = batches.keys().next().value;
    if (oldestKey) batches.delete(oldestKey);
  }
  batches.set(batchId, batch);

  log.info("Batch claim submission queued", {
    component: "rcm-batch",
    batchId,
    claimCount: claimIds.length,
  });

  // Process asynchronously
  processBatch(batchId, claimIds, request.concurrency).catch((err) => {
    log.error("Batch processing error", {
      component: "rcm-batch",
      batchId,
      error: (err as Error).message,
    });
  });

  return batch;
}

/**
 * Get batch status.
 */
export function getBatchStatus(batchId: string): BatchStatus | undefined {
  return batches.get(batchId);
}

/**
 * List all batches.
 */
export function listBatches(limit = 50): BatchStatus[] {
  return Array.from(batches.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Internal Processing                                                */
/* ------------------------------------------------------------------ */

async function processBatch(
  batchId: string,
  claimIds: string[],
  concurrency?: number,
): Promise<void> {
  const batch = batches.get(batchId);
  if (!batch) return;

  batch.status = "processing";
  const maxConcurrent = Math.min(concurrency || MAX_BATCH_CONCURRENCY, MAX_BATCH_CONCURRENCY);

  // Process in chunks for concurrency control
  for (let i = 0; i < claimIds.length; i += maxConcurrent) {
    const chunk = claimIds.slice(i, i + maxConcurrent);
    const results = await Promise.allSettled(
      chunk.map((claimId) => processOneClaim(claimId)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      batch.processed++;

      if (result.status === "fulfilled") {
        batch.results.push(result.value);
        if (result.value.ok) {
          batch.succeeded++;
        } else {
          batch.failed++;
        }
      } else {
        batch.failed++;
        batch.results.push({
          claimId: chunk[j]!,
          ok: false,
          error: result.reason?.message || "Unknown error",
          durationMs: 0,
        });
      }
    }
  }

  batch.status = batch.failed === batch.totalClaims ? "failed" : "completed";
  batch.completedAt = Date.now();

  log.info("Batch claim submission completed", {
    component: "rcm-batch",
    batchId,
    total: batch.totalClaims,
    succeeded: batch.succeeded,
    failed: batch.failed,
    durationMs: batch.completedAt - batch.startedAt,
  });
}

async function processOneClaim(claimId: string): Promise<BatchClaimResult> {
  const start = Date.now();
  try {
    const claim = getClaim(claimId);
    if (!claim) {
      return { claimId, ok: false, error: "Claim not found", durationMs: Date.now() - start };
    }

    // Find connector for this claim's payer
    const connector = resolveConnector(claim);
    if (!connector) {
      return { claimId, ok: false, error: "No connector for payer integration mode", durationMs: Date.now() - start };
    }

    // Build EDI payload
    const ediClaim = buildClaim837FromDomain(claim);
    const payload = serialize837(ediClaim);

    // Create pipeline entry
    const pipelineEntry = createPipelineEntry(claimId, "837P", connector.id, claim.payerId);

    // Submit through resilient wrapper
    const result = await resilientConnectorCall(
      connector.id,
      "submit",
      () => connector.submit("837P" as any, payload, { claimId, batchMode: "true" }),
    );

    if (result.success) {
      advancePipelineStage(pipelineEntry.id, "transmit");
      return {
        claimId,
        ok: true,
        transactionId: result.transactionId,
        durationMs: Date.now() - start,
      };
    } else {
      advancePipelineStage(pipelineEntry.id, "error", { errors: result.errors });
      return {
        claimId,
        ok: false,
        error: result.errors.map((e) => e.description || e.code).join("; ") || "Submission failed",
        durationMs: Date.now() - start,
      };
    }
  } catch (err) {
    return {
      claimId,
      ok: false,
      error: (err as Error).message,
      durationMs: Date.now() - start,
    };
  }
}

function resolveConnector(claim: Claim): RcmConnector | undefined {
  // Try claim's integration mode, fall back to sandbox
  return getConnectorForMode(claim.payerId) || getConnectorForMode("sandbox");
}
