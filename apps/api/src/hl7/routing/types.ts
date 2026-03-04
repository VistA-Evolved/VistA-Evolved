/**
 * HL7v2 Routing — Type Definitions
 *
 * Phase 240 (Wave 6 P3): Types for message routing, filtering,
 * transformation, and destination dispatch.
 */

import type { Hl7Message, Hl7Ack } from '../types.js';

/* ------------------------------------------------------------------ */
/*  Route Filter Types                                                 */
/* ------------------------------------------------------------------ */

/** Filter criteria for matching inbound HL7v2 messages to routes. */
export interface RouteFilter {
  /** Match specific message types (e.g., "ADT^A01", "ORM^O01"). Empty = match all. */
  messageTypes?: string[];
  /** Match specific sending applications (MSH-3). Empty = match all. */
  sendingApplications?: string[];
  /** Match specific sending facilities (MSH-4). Empty = match all. */
  sendingFacilities?: string[];
  /** Match specific HL7 versions (MSH-12). Empty = match all. */
  versions?: string[];
  /** Custom filter function (for advanced matching). */
  customFilter?: (message: Hl7Message) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Transform Types                                                    */
/* ------------------------------------------------------------------ */

/** Transform operation type */
export type TransformOp =
  | 'copy-field' // Copy field value from one location to another
  | 'set-field' // Set a field to a fixed value
  | 'remove-segment' // Remove all segments of a type
  | 'filter-segments' // Keep only specified segment types
  | 'replace-value' // Find/replace within field values
  | 'custom'; // Custom transform function

/** A single transform step in the pipeline. */
export interface TransformStep {
  /** Unique step ID for logging */
  id: string;
  /** Operation type */
  op: TransformOp;
  /** Operation parameters (varies by op type) */
  params: Record<string, unknown>;
  /** Optional description */
  description?: string;
}

/** Transform pipeline result */
export interface TransformResult {
  /** Transformed message text */
  messageText: string;
  /** Steps that were applied */
  appliedSteps: string[];
  /** Steps that were skipped (e.g., no match) */
  skippedSteps: string[];
  /** Any warnings */
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/*  Destination Types                                                  */
/* ------------------------------------------------------------------ */

/** Destination type for routing */
export type DestinationType =
  | 'mllp' // Forward via MLLP to another system
  | 'vista-rpc' // Bridge to VistA via RPC
  | 'http' // POST to HTTP endpoint
  | 'dead-letter'; // Dead-letter queue (unroutable)

/** Destination configuration */
export interface RouteDestination {
  /** Destination type */
  type: DestinationType;
  /** Destination identifier */
  id: string;
  /** Display name */
  name: string;
  /** MLLP: host:port. HTTP: URL. VistA-RPC: rpc name. */
  target: string;
  /** Connection timeout in ms */
  timeoutMs?: number;
  /** Whether to wait for ACK before considering the message delivered */
  waitForAck?: boolean;
}

/** Dispatch result */
export interface DispatchResult {
  /** Whether the dispatch succeeded */
  ok: boolean;
  /** Destination ID */
  destinationId: string;
  /** ACK received (if waitForAck) */
  ack?: Hl7Ack;
  /** Error message (if !ok) */
  error?: string;
  /** Duration in ms */
  durationMs: number;
}

/* ------------------------------------------------------------------ */
/*  Route Definition                                                   */
/* ------------------------------------------------------------------ */

/** A complete route: filter -> transform -> destination */
export interface Hl7Route {
  /** Unique route ID */
  id: string;
  /** Display name */
  name: string;
  /** Route description */
  description?: string;
  /** Whether this route is enabled */
  enabled: boolean;
  /** Priority (lower = higher priority, evaluated in order) */
  priority: number;
  /** Message filter criteria */
  filter: RouteFilter;
  /** Transformation pipeline steps */
  transforms: TransformStep[];
  /** Destination for matched messages */
  destination: RouteDestination;
  /** Created timestamp */
  createdAt: number;
  /** Updated timestamp */
  updatedAt: number;
}

/** Route execution statistics */
export interface RouteStats {
  /** Route ID */
  routeId: string;
  /** Total messages matched */
  matched: number;
  /** Successfully dispatched */
  dispatched: number;
  /** Failed dispatches */
  failed: number;
  /** Average dispatch duration in ms */
  avgDurationMs: number;
  /** Last matched timestamp */
  lastMatchedAt: number;
}

/** Dead-letter entry for unroutable messages */
export interface DeadLetterEntry {
  /** Unique entry ID */
  id: string;
  /** Message type */
  messageType: string;
  /** Message control ID */
  messageControlId: string;
  /** Sending application */
  sendingApplication: string;
  /** Timestamp */
  receivedAt: number;
  /** Reason for dead-lettering */
  reason: string;
  /** Retry count */
  retryCount: number;
}
