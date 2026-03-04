/**
 * RCM Connector Interface — Pluggable Transport Layer
 *
 * All payer connectivity goes through a connector that implements this
 * interface. The connector is selected based on payer.integrationMode.
 *
 * Phase 38 — RCM + Payer Connectivity
 */

import type { X12TransactionSet, EdiResponseError } from '../edi/types.js';

/* ─── Connector constants ────────────────────────────────────────── */

/** Default timeout for outbound connector calls (ms). Connectors should
 *  abort any HTTP/TCP request that exceeds this. Override per-connector
 *  via env var or constructor option.  */
export const CONNECTOR_DEFAULT_TIMEOUT_MS = Number(process.env.RCM_CONNECTOR_TIMEOUT_MS ?? 30_000);

/** Default timeout for health-check probes (ms). */
export const CONNECTOR_HEALTH_TIMEOUT_MS = Number(process.env.RCM_HEALTH_TIMEOUT_MS ?? 10_000);

/* ─── Connector interface ────────────────────────────────────────── */

export interface ConnectorResult {
  success: boolean;
  transactionId?: string; // tracking ID from the remote system
  responsePayload?: string; // raw response for audit/parsing
  errors: EdiResponseError[];
  metadata?: Record<string, string>;
}

export interface RcmConnector {
  /** Unique connector ID */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Which integration modes this connector handles */
  readonly supportedModes: string[];

  /** Which transaction sets this connector can process */
  readonly supportedTransactions: X12TransactionSet[];

  /** Initialize connector (load config, test connectivity) */
  initialize(): Promise<void>;

  /** Submit an outbound transaction */
  submit(
    transactionSet: X12TransactionSet,
    payload: string, // serialized EDI or structured JSON
    metadata: Record<string, string>
  ): Promise<ConnectorResult>;

  /** Check status of a previously submitted transaction */
  checkStatus(transactionId: string): Promise<ConnectorResult>;

  /** Retrieve inbound responses (835s, 271s, etc.) */
  fetchResponses(since?: string): Promise<
    Array<{
      transactionSet: X12TransactionSet;
      payload: string;
      receivedAt: string;
    }>
  >;

  /** Health check */
  healthCheck(): Promise<{ healthy: boolean; details?: string }>;

  /** Shutdown / cleanup */
  shutdown(): Promise<void>;
}

/* ─── Connector registry ─────────────────────────────────────────── */

const connectors = new Map<string, RcmConnector>();

export function registerConnector(connector: RcmConnector): void {
  connectors.set(connector.id, connector);
}

export function getConnector(id: string): RcmConnector | undefined {
  return connectors.get(id);
}

export function listConnectors(): Array<{
  id: string;
  name: string;
  supportedModes: string[];
  supportedTransactions: X12TransactionSet[];
}> {
  return Array.from(connectors.values()).map((c) => ({
    id: c.id,
    name: c.name,
    supportedModes: c.supportedModes,
    supportedTransactions: c.supportedTransactions,
  }));
}

export function getConnectorForMode(mode: string): RcmConnector | undefined {
  for (const c of connectors.values()) {
    if (c.supportedModes.includes(mode)) return c;
  }
  return undefined;
}

export function getAllConnectors(): Map<string, RcmConnector> {
  return connectors;
}
