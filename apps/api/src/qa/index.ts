/**
 * QA Module — Barrel Export
 *
 * Phase 96B: QA/Audit OS v1.1
 */

export type {
  RpcTraceEntry,
  RpcTraceStats,
  QaFlow,
  QaFlowStep,
  QaFlowResult,
  QaStepResult,
  DeadClickEntry,
} from "./types.js";

export {
  recordRpcTrace,
  getRecentTraces,
  getTracesByRpc,
  getTracesByRequestId,
  getFailedTraces,
  getRpcTraceStats,
  clearRpcTraceBuffer,
  isRpcTraceEnabled,
} from "./rpc-trace.js";

export {
  loadFlowCatalog,
  getAllFlows,
  getFlowById,
  getFlowsByPriority,
  getFlowsByDomain,
  executeFlow,
  storeFlowResult,
  getRecentFlowResults,
  getFlowResultsByFlowId,
} from "./flow-catalog.js";

/* Phase 479: Contract trace recorder */
export {
  startTraceSession,
  recordTraceEntry,
  endTraceSession,
  getTraceSession,
  getActiveSessions,
  getCompletedSessions,
  saveAsGolden,
  loadGoldenTrace,
  listGoldenTraces,
  compareToGolden,
  compareTraces,
  WORKFLOW_TEMPLATES,
} from "./rpc-contract-trace.js";

export type {
  TraceSession,
  ContractTraceEntry,
  CompareResult,
} from "./rpc-contract-trace.js";
