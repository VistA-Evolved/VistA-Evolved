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
