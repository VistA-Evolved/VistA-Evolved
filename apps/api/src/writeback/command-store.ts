/**
 * Clinical Writeback Command Bus — Command Store
 *
 * Phase 300 (W12-P2): In-memory + PG-backed command persistence.
 *
 * Stores clinical_commands, clinical_command_attempts, clinical_command_results.
 * In-memory for fast access; PG for durability (when wired).
 */

import { randomUUID } from "crypto";
import { createHash } from "crypto";
import type {
  ClinicalCommand,
  CommandAttempt,
  CommandResult,
  CommandStatus,
  SubmitCommandRequest,
  DryRunTranscript,
} from "./types.js";
import { INTENT_DOMAIN_MAP } from "./types.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* PG write-through repo (wired from lifecycle.ts)                     */
/* ------------------------------------------------------------------ */

interface CommandRepo {
  insert(data: any): Promise<any>;
  upsert(data: any): Promise<any>;
  findById(id: string): Promise<any>;
  findByField(field: string, value: unknown, tenantId?: string): Promise<any[]>;
  findByTenant(tenantId: string, opts?: { limit?: number; offset?: number }): Promise<any[]>;
  query(sql: string, params: unknown[]): Promise<any[]>;
}

let _cmdRepo: CommandRepo | null = null;
let _attemptRepo: CommandRepo | null = null;
let _resultRepo: CommandRepo | null = null;

/** Wire PG repos for write-through. Called from lifecycle.ts after PG init. */
export function initCommandStoreRepos(repos: {
  commandRepo: CommandRepo;
  attemptRepo: CommandRepo;
  resultRepo: CommandRepo;
}): void {
  _cmdRepo = repos.commandRepo;
  _attemptRepo = repos.attemptRepo;
  _resultRepo = repos.resultRepo;
  log.info("Command store repos wired to PG (W41-P1)");
}

/** Rehydrate in-memory maps from PG on startup. */
export async function rehydrateCommandStore(tenantId?: string): Promise<number> {
  if (!_cmdRepo) return 0;
  try {
    const rows = await _cmdRepo.findByTenant(tenantId || "default", { limit: MAX_COMMANDS });
    let count = 0;
    for (const row of rows) {
      if (!commands.has(row.id)) {
        commands.set(row.id, {
          id: row.id,
          tenantId: row.tenantId,
          patientRefHash: row.patientRefHash,
          domain: row.domain,
          intent: row.intent,
          payloadJson: row.payloadJson,
          idempotencyKey: row.idempotencyKey,
          status: row.status,
          createdAt: row.createdAt,
          createdBy: row.createdBy,
          correlationId: row.correlationId,
          attemptCount: row.attemptCount || 0,
          lastError: row.lastError,
          dryRunTranscript: row.dryRunTranscript,
        });
        if (row.idempotencyKey) {
          idempotencyIndex.set(compositeKey(row.tenantId, row.idempotencyKey), row.id);
        }
        count++;
      }
    }
    log.info(`Command store rehydrated ${count} commands from PG`);
    return count;
  } catch (err: any) {
    log.warn("Command store rehydration failed", { error: err.message });
    return 0;
  }
}

/** Fire-and-forget PG persist for a command */
function persistCommand(cmd: ClinicalCommand): void {
  if (!_cmdRepo) return;
  void _cmdRepo.upsert({
    id: cmd.id,
    tenantId: cmd.tenantId,
    patientRefHash: cmd.patientRefHash,
    domain: cmd.domain,
    intent: cmd.intent,
    payloadJson: typeof cmd.payloadJson === "string" ? cmd.payloadJson : JSON.stringify(cmd.payloadJson),
    idempotencyKey: cmd.idempotencyKey,
    status: cmd.status,
    createdAt: cmd.createdAt,
    createdBy: cmd.createdBy,
    correlationId: cmd.correlationId,
    attemptCount: cmd.attemptCount,
    lastError: cmd.lastError || null,
    dryRunTranscript: cmd.dryRunTranscript ? JSON.stringify(cmd.dryRunTranscript) : null,
  }).catch((e: any) => log.warn("PG command persist failed", { error: String(e) }));
}

/** Fire-and-forget PG persist for an attempt */
function persistAttempt(attempt: CommandAttempt): void {
  if (!_attemptRepo) return;
  void _attemptRepo.insert({
    id: `${attempt.commandId}-${attempt.attemptNo}`,
    commandId: attempt.commandId,
    attemptNo: attempt.attemptNo,
    status: attempt.status,
    error: attempt.errorDetailRedacted || attempt.errorClass || null,
    startedAt: attempt.startedAt,
    completedAt: attempt.endedAt || null,
    tenantId: "default",
  }).catch((e: any) => log.warn("PG attempt persist failed", { error: String(e) }));
}

/** Fire-and-forget PG persist for a result */
function persistResult(result: CommandResult): void {
  if (!_resultRepo) return;
  void _resultRepo.upsert({
    id: result.commandId,
    commandId: result.commandId,
    vistaRefs: typeof result.vistaRefs === "string" ? result.vistaRefs : JSON.stringify(result.vistaRefs || {}),
    resultSummary: typeof result.resultSummary === "string" ? result.resultSummary : JSON.stringify(result.resultSummary || {}),
    tenantId: "default",
  }).catch((e: any) => log.warn("PG result persist failed", { error: String(e) }));
}

/* ------------------------------------------------------------------ */
/* In-memory stores                                                    */
/* ------------------------------------------------------------------ */

const commands = new Map<string, ClinicalCommand>();
const attempts = new Map<string, CommandAttempt[]>();
const results = new Map<string, CommandResult>();
const idempotencyIndex = new Map<string, string>(); // compositeKey -> commandId

const MAX_COMMANDS = 50_000;
const PRUNE_BATCH = 5_000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function compositeKey(tenantId: string, idempotencyKey: string): string {
  return `${tenantId}::${idempotencyKey}`;
}

function pruneOldest(): void {
  if (commands.size <= MAX_COMMANDS) return;
  const sorted = [...commands.entries()]
    .sort((a, b) => a[1].createdAt.localeCompare(b[1].createdAt));
  for (let i = 0; i < PRUNE_BATCH && i < sorted.length; i++) {
    const [id] = sorted[i];
    commands.delete(id);
    attempts.delete(id);
    results.delete(id);
  }
  log.debug(`Pruned ${PRUNE_BATCH} oldest commands, remaining: ${commands.size}`);
}

/* ------------------------------------------------------------------ */
/* CRUD operations                                                     */
/* ------------------------------------------------------------------ */

/**
 * Create a new clinical command from a submission request.
 * Returns null if idempotency key already exists (returns existing command).
 */
export function createCommand(req: SubmitCommandRequest): {
  command: ClinicalCommand;
  isNew: boolean;
} {
  // Validate domain matches intent
  const expectedDomain = INTENT_DOMAIN_MAP[req.intent];
  if (expectedDomain !== req.domain) {
    throw new Error(
      `Intent ${req.intent} belongs to domain ${expectedDomain}, not ${req.domain}`,
    );
  }

  // Check idempotency
  const ck = compositeKey(req.tenantId, req.idempotencyKey);
  const existingId = idempotencyIndex.get(ck);
  if (existingId) {
    const existing = commands.get(existingId);
    if (existing) {
      return { command: existing, isNew: false };
    }
    // Stale index entry
    idempotencyIndex.delete(ck);
  }

  // Create new command
  pruneOldest();
  const id = randomUUID();
  const command: ClinicalCommand = {
    id,
    tenantId: req.tenantId,
    patientRefHash: req.patientRefHash,
    domain: req.domain,
    intent: req.intent,
    payloadJson: req.payload,
    idempotencyKey: req.idempotencyKey,
    status: "pending",
    createdAt: new Date().toISOString(),
    createdBy: req.createdBy,
    correlationId: req.correlationId || randomUUID(),
    attemptCount: 0,
  };

  commands.set(id, command);
  idempotencyIndex.set(ck, id);
  persistCommand(command);

  return { command, isNew: true };
}

/**
 * Get a command by ID.
 */
export function getCommand(id: string): ClinicalCommand | undefined {
  return commands.get(id);
}

/**
 * Update command status.
 */
export function updateCommandStatus(
  id: string,
  status: CommandStatus,
  error?: string,
): ClinicalCommand | undefined {
  const cmd = commands.get(id);
  if (!cmd) return undefined;
  cmd.status = status;
  if (error) cmd.lastError = error;
  persistCommand(cmd);
  return cmd;
}

/**
 * Set the dry-run transcript on a command.
 */
export function setDryRunTranscript(
  id: string,
  transcript: DryRunTranscript,
): void {
  const cmd = commands.get(id);
  if (cmd) {
    cmd.dryRunTranscript = transcript;
    cmd.status = "dry_run";
    persistCommand(cmd);
  }
}

/**
 * Record an execution attempt.
 */
export function recordAttempt(attempt: CommandAttempt): void {
  const list = attempts.get(attempt.commandId) || [];
  list.push(attempt);
  attempts.set(attempt.commandId, list);
  persistAttempt(attempt);

  const cmd = commands.get(attempt.commandId);
  if (cmd) {
    cmd.attemptCount = list.length;
    persistCommand(cmd);
  }
}

/**
 * Get attempts for a command.
 */
export function getAttempts(commandId: string): CommandAttempt[] {
  return attempts.get(commandId) || [];
}

/**
 * Record a command result.
 */
export function recordResult(result: CommandResult): void {
  results.set(result.commandId, result);
  persistResult(result);
}

/**
 * Get result for a command.
 */
export function getResult(commandId: string): CommandResult | undefined {
  return results.get(commandId);
}

/**
 * List commands with optional filters.
 */
export function listCommands(opts?: {
  tenantId?: string;
  domain?: string;
  status?: CommandStatus;
  limit?: number;
  offset?: number;
}): { items: ClinicalCommand[]; total: number } {
  let items = [...commands.values()];

  if (opts?.tenantId) items = items.filter((c) => c.tenantId === opts.tenantId);
  if (opts?.domain) items = items.filter((c) => c.domain === opts.domain);
  if (opts?.status) items = items.filter((c) => c.status === opts.status);

  // Sort newest first
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = items.length;
  const offset = opts?.offset || 0;
  const limit = opts?.limit || 50;
  items = items.slice(offset, offset + limit);

  return { items, total };
}

/**
 * Get store statistics.
 */
export function getCommandStoreStats(): {
  commands: number;
  attempts: number;
  results: number;
  idempotencyKeys: number;
  maxCommands: number;
} {
  let totalAttempts = 0;
  for (const list of attempts.values()) totalAttempts += list.length;

  return {
    commands: commands.size,
    attempts: totalAttempts,
    results: results.size,
    idempotencyKeys: idempotencyIndex.size,
    maxCommands: MAX_COMMANDS,
  };
}

/**
 * Clear all stores (testing only).
 */
export function clearCommandStore(): void {
  commands.clear();
  attempts.clear();
  results.clear();
  idempotencyIndex.clear();
}
