/**
 * Clinical Writeback Command Bus — Core Bus
 *
 * Phase 300 (W12-P2): Command submission + processing + audit pipeline.
 *
 * Flow:
 *   1. submitCommand() — validate, check gate, check idempotency, persist
 *   2. processCommand() — pick up pending, check dry-run, execute via RpcExecutor, record result
 *   3. All state transitions are audited via immutable-audit
 */

import { randomUUID } from "crypto";
import type {
  ClinicalCommand,
  CommandAttempt,
  CommandExecutionResult,
  SubmitCommandRequest,
  RpcExecutor,
  WritebackDomain,
  DryRunTranscript,
} from "./types.js";
import { INTENT_DOMAIN_MAP } from "./types.js";
import {
  createCommand,
  getCommand,
  updateCommandStatus,
  setDryRunTranscript,
  recordAttempt,
  recordResult,
  getAttempts,
  getResult,
} from "./command-store.js";
import { checkWritebackGate } from "./gates.js";
import { log } from "../lib/logger.js";
import { immutableAudit } from "../lib/immutable-audit.js";

/* ------------------------------------------------------------------ */
/* Executor registry                                                   */
/* ------------------------------------------------------------------ */

const executors = new Map<WritebackDomain, RpcExecutor>();

/**
 * Register an RPC executor for a domain.
 * Each domain has exactly one executor (adapter pattern).
 */
export function registerExecutor(domain: WritebackDomain, executor: RpcExecutor): void {
  executors.set(domain, executor);
  log.info(`Writeback executor registered for domain=${domain}`);
}

/**
 * Get the executor for a domain. Returns undefined if not registered.
 */
export function getExecutor(domain: WritebackDomain): RpcExecutor | undefined {
  return executors.get(domain);
}

/* ------------------------------------------------------------------ */
/* Submit                                                               */
/* ------------------------------------------------------------------ */

/**
 * Submit a clinical writeback command.
 *
 * 1. Validates intent ↔ domain mapping
 * 2. Checks feature gate
 * 3. Checks idempotency (returns existing result if duplicate)
 * 4. Persists as pending
 * 5. Returns command ID for tracking
 */
export function submitCommand(req: SubmitCommandRequest): CommandExecutionResult {
  // 1. Validate intent matches domain
  const expectedDomain = INTENT_DOMAIN_MAP[req.intent];
  if (expectedDomain !== req.domain) {
    return {
      commandId: "",
      status: "rejected",
      error: `Intent ${req.intent} belongs to domain ${expectedDomain}, not ${req.domain}`,
    };
  }

  // 2. Check gate
  const gate = checkWritebackGate(req.domain, req.tenantId, req.forceDryRun);
  if (!gate.allowed) {
    log.info(`Writeback rejected: domain=${req.domain} reason=${gate.reason}`);
    immutableAudit("writeback.reject", "failure", { sub: req.createdBy, name: req.createdBy }, {
      tenantId: req.tenantId,
      detail: { domain: req.domain, intent: req.intent, reason: gate.reason },
    });
    return {
      commandId: "",
      status: "rejected",
      error: gate.reason || "Writeback not allowed",
    };
  }

  // 3. Create (idempotency check is inside createCommand)
  const { command, isNew } = createCommand(req);

  if (!isNew) {
    // Return existing command status
    const existingResult = getResult(command.id);
    return {
      commandId: command.id,
      status: command.status,
      vistaRefs: existingResult?.vistaRefs,
      resultSummary: existingResult?.resultSummary,
      dryRunTranscript: command.dryRunTranscript,
    };
  }

  // 4. If dry-run, process immediately
  if (gate.dryRun) {
    return processDryRun(command);
  }

  // 5. Return pending (worker will pick up)
  log.info(`Writeback command submitted: id=${command.id} domain=${req.domain} intent=${req.intent}`);
  immutableAudit("writeback.submit", "success", { sub: req.createdBy, name: req.createdBy }, {
    tenantId: req.tenantId,
    detail: { commandId: command.id, domain: req.domain, intent: req.intent },
  });
  return {
    commandId: command.id,
    status: "pending",
  };
}

/* ------------------------------------------------------------------ */
/* Process (called by worker or inline)                                 */
/* ------------------------------------------------------------------ */

/**
 * Process a pending command — execute the RPC via the domain executor.
 */
export async function processCommand(commandId: string): Promise<CommandExecutionResult> {
  const cmd = getCommand(commandId);
  if (!cmd) {
    return { commandId, status: "failed", error: "Command not found" };
  }

  if (cmd.status !== "pending" && cmd.status !== "retrying") {
    return {
      commandId,
      status: cmd.status,
      dryRunTranscript: cmd.dryRunTranscript,
    };
  }

  // Transition to processing
  updateCommandStatus(commandId, "processing");

  const executor = executors.get(cmd.domain);
  if (!executor) {
    updateCommandStatus(commandId, "failed", `No executor registered for domain ${cmd.domain}`);
    return {
      commandId,
      status: "failed",
      error: `No executor registered for domain ${cmd.domain}`,
    };
  }

  // Record attempt
  const attemptNo = (getAttempts(commandId).length || 0) + 1;
  const attempt: CommandAttempt = {
    commandId,
    attemptNo,
    startedAt: new Date().toISOString(),
    status: "running",
  };
  recordAttempt(attempt);

  try {
    const result = await executor.execute(cmd);

    // Success
    attempt.status = "success";
    attempt.endedAt = new Date().toISOString();

    recordResult({
      commandId,
      vistaRefs: result.vistaRefs,
      resultSummary: result.resultSummary,
      completedAt: new Date().toISOString(),
    });

    updateCommandStatus(commandId, "completed");

    log.info(`Writeback completed: id=${commandId} domain=${cmd.domain} intent=${cmd.intent}`);
    immutableAudit("writeback.execute", "success", { sub: cmd.createdBy, name: cmd.createdBy }, {
      tenantId: cmd.tenantId,
      detail: { commandId, domain: cmd.domain, intent: cmd.intent },
    });

    return {
      commandId,
      status: "completed",
      vistaRefs: result.vistaRefs,
      resultSummary: result.resultSummary,
    };
  } catch (err: any) {
    const errorClass = err.errorClass || "unknown";
    const isTransient = errorClass === "transient" || errorClass === "timeout";

    attempt.status = isTransient ? "transient_failure" : "permanent_failure";
    attempt.endedAt = new Date().toISOString();
    attempt.errorClass = errorClass;
    attempt.errorDetailRedacted = String(err.message || err).slice(0, 200);

    const newStatus = isTransient && attemptNo < 3 ? "retrying" : "failed";
    updateCommandStatus(commandId, newStatus, attempt.errorDetailRedacted);

    const auditAction = newStatus === "retrying" ? "writeback.retry" as const : "writeback.fail" as const;
    immutableAudit(auditAction, "failure", { sub: cmd.createdBy, name: cmd.createdBy }, {
      tenantId: cmd.tenantId,
      detail: { commandId, domain: cmd.domain, intent: cmd.intent, errorClass, attempt: attemptNo },
    });

    log.warn(
      `Writeback ${newStatus}: id=${commandId} domain=${cmd.domain} error=${errorClass} attempt=${attemptNo}`,
    );

    return {
      commandId,
      status: newStatus,
      error: attempt.errorDetailRedacted,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Dry-run                                                              */
/* ------------------------------------------------------------------ */

function processDryRun(cmd: ClinicalCommand): CommandExecutionResult {
  const executor = executors.get(cmd.domain);

  let transcript: DryRunTranscript;
  if (executor) {
    transcript = executor.dryRun(cmd);
  } else {
    transcript = {
      rpcName: `[no executor for ${cmd.domain}]`,
      params: cmd.payloadJson,
      simulatedResult: "No executor registered — dry-run transcript only",
      recordedAt: new Date().toISOString(),
    };
  }

  setDryRunTranscript(cmd.id, transcript);

  log.info(`Writeback dry-run: id=${cmd.id} domain=${cmd.domain} intent=${cmd.intent} rpc=${transcript.rpcName}`);
  immutableAudit("writeback.dry_run", "success", { sub: cmd.createdBy, name: cmd.createdBy }, {
    tenantId: cmd.tenantId,
    detail: { commandId: cmd.id, domain: cmd.domain, intent: cmd.intent, rpcName: transcript.rpcName },
  });

  return {
    commandId: cmd.id,
    status: "dry_run",
    dryRunTranscript: transcript,
  };
}

/* ------------------------------------------------------------------ */
/* Query helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Get full command status + result + attempts.
 */
export function getCommandDetail(commandId: string): {
  command: ClinicalCommand | undefined;
  attempts: CommandAttempt[];
  result: import("./types.js").CommandResult | undefined;
} {
  return {
    command: getCommand(commandId),
    attempts: getAttempts(commandId),
    result: getResult(commandId),
  };
}
