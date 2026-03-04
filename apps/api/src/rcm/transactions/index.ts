/**
 * Transaction Correctness Engine — Barrel Export
 *
 * Phase 45: Central export for all transaction engine modules.
 * Initializes translators on import.
 */

// Types
export type {
  TransactionEnvelope,
  TransactionState,
  TransactionRecord,
  TranslatorResult,
  ParsedResponse,
  ConnectivityProfile,
  ReconciliationSummary,
} from './types.js';
export { TRANSACTION_STATE_TRANSITIONS } from './types.js';

// Envelope + Store
export {
  buildEnvelope,
  nextControlNumber,
  storeTransaction,
  getTransaction,
  getTransactionsByCorrelation,
  getTransactionsBySource,
  transitionTransaction,
  listTransactions,
  getTransactionStats,
  resetTransactionStore,
} from './envelope.js';

// Translator interface + registry
export {
  registerTranslator,
  getTranslator,
  getActiveTranslator,
  listTranslators,
} from './translator.js';
export type { Translator } from './translator.js';

// Local scaffold translator
export { localScaffoldTranslator } from './local-scaffold-translator.js';

// External translator adapter
export { externalTranslatorAdapter } from './external-translator-adapter.js';

// Connectivity
export {
  getConnectivityProfile,
  updateConnectivityProfile,
  resetConnectivityProfile,
  checkPreTransmitGates,
  checkAckGates,
  calculateRetryDelay,
  shouldRetry,
  processRetry,
  getDLQTransactions,
  retryFromDLQ,
  getConnectivityHealth,
} from './connectivity.js';

// Reconciliation
export { buildReconciliationSummary, buildReconciliationStats } from './reconciliation.js';

/* ── Auto-register translators ───────────────────────────────── */

import { registerTranslator } from './translator.js';
import { localScaffoldTranslator } from './local-scaffold-translator.js';
import { externalTranslatorAdapter } from './external-translator-adapter.js';

registerTranslator(localScaffoldTranslator);
registerTranslator(externalTranslatorAdapter);
