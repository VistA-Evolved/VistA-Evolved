/**
 * Clinical Writeback Command Bus — Barrel Export
 *
 * Phase 300 (W12-P2): Re-exports for clean imports.
 */

export type {
  WritebackDomain,
  WritebackIntent,
  CommandStatus,
  ClinicalCommand,
  CommandAttempt,
  CommandResult,
  DryRunTranscript,
  SubmitCommandRequest,
  CommandExecutionResult,
  WritebackGateConfig,
  RpcExecutor,
} from "./types.js";

export { INTENT_DOMAIN_MAP } from "./types.js";

export {
  submitCommand,
  processCommand,
  getCommandDetail,
  registerExecutor,
  getExecutor,
} from "./command-bus.js";

export {
  createCommand,
  getCommand,
  listCommands,
  getCommandStoreStats,
  clearCommandStore,
} from "./command-store.js";

export {
  resolveGateConfig,
  checkWritebackGate,
  getWritebackGateSummary,
} from "./gates.js";
