/**
 * HL7v2 Engine -- Type Definitions
 *
 * Phase 239 (Wave 6 P2): Core types for MLLP framing, HL7v2 message parsing,
 * ACK generation, and connection management.
 *
 * Design:
 *   - Zero external dependencies (matching project pattern: analytics-etl.ts PG wire,
 *     rpcBrokerClient.ts XWB protocol)
 *   - PHI-aware: message content types include sanitization hooks
 *   - All types are immutable where possible
 */

/* ------------------------------------------------------------------ */
/*  MLLP Protocol Constants                                            */
/* ------------------------------------------------------------------ */

/** MLLP Start Block (vertical tab) */
export const MLLP_START_BLOCK = 0x0b;

/** MLLP End Block (file separator) */
export const MLLP_END_BLOCK = 0x1c;

/** MLLP Carriage Return (message terminator) */
export const MLLP_CR = 0x0d;

/** Default MLLP port */
export const MLLP_DEFAULT_PORT = 2575;

/** Default MLLPS (TLS) port */
export const MLLPS_DEFAULT_PORT = 2576;

/* ------------------------------------------------------------------ */
/*  HL7v2 Message Types                                                */
/* ------------------------------------------------------------------ */

/** Standard HL7v2 field separator */
export const HL7_FIELD_SEP = '|';

/** Standard HL7v2 component separator */
export const HL7_COMPONENT_SEP = '^';

/** Standard HL7v2 subcomponent separator */
export const HL7_SUBCOMPONENT_SEP = '&';

/** Standard HL7v2 repetition separator */
export const HL7_REPETITION_SEP = '~';

/** Standard HL7v2 escape character */
export const HL7_ESCAPE_CHAR = '\\';

/** Standard HL7v2 segment terminator */
export const HL7_SEGMENT_SEP = '\r';

/** HL7v2 segment -- parsed representation */
export interface Hl7Segment {
  /** Segment type identifier (e.g., "MSH", "PID", "OBX") */
  readonly name: string;
  /** Raw segment text (CR-terminated) */
  readonly raw: string;
  /** Fields split by field separator (index 0 = segment name) */
  readonly fields: readonly string[];
}

/** HL7v2 MSH (Message Header) -- extracted header fields */
export interface Hl7Msh {
  readonly fieldSeparator: string;
  readonly encodingCharacters: string;
  readonly sendingApplication: string;
  readonly sendingFacility: string;
  readonly receivingApplication: string;
  readonly receivingFacility: string;
  readonly dateTime: string;
  readonly security: string;
  readonly messageType: string;
  readonly messageControlId: string;
  readonly processingId: string;
  readonly versionId: string;
}

/** Parsed HL7v2 message */
export interface Hl7Message {
  /** Raw message text */
  readonly raw: string;
  /** Parsed MSH header */
  readonly msh: Hl7Msh;
  /** All segments (including MSH) */
  readonly segments: readonly Hl7Segment[];
  /** Message type + trigger event (e.g., "ADT^A01") */
  readonly messageType: string;
  /** Unique message control ID (MSH-10) */
  readonly messageControlId: string;
  /** HL7 version (e.g., "2.4", "2.5.1") */
  readonly version: string;
}

/* ------------------------------------------------------------------ */
/*  ACK Types                                                          */
/* ------------------------------------------------------------------ */

/**
 * HL7v2 acknowledgement codes.
 * AA = Application Accept
 * AE = Application Error
 * AR = Application Reject
 * CA = Commit Accept (enhanced mode)
 * CE = Commit Error (enhanced mode)
 * CR = Commit Reject (enhanced mode)
 */
export type AckCode = 'AA' | 'AE' | 'AR' | 'CA' | 'CE' | 'CR';

/** ACK message result */
export interface Hl7Ack {
  /** The full ACK message text (HL7v2 format) */
  readonly message: string;
  /** The ack code used */
  readonly ackCode: AckCode;
  /** The original message control ID being acknowledged */
  readonly messageControlId: string;
  /** Optional error text (for AE/AR) */
  readonly errorText?: string;
}

/* ------------------------------------------------------------------ */
/*  Connection Types                                                   */
/* ------------------------------------------------------------------ */

/** MLLP connection state */
export type ConnectionState = 'connecting' | 'connected' | 'idle' | 'disconnected' | 'error';

/** MLLP peer connection descriptor */
export interface MllpConnection {
  /** Unique connection ID */
  readonly id: string;
  /** Remote host */
  readonly remoteHost: string;
  /** Remote port */
  readonly remotePort: number;
  /** Current state */
  state: ConnectionState;
  /** When the connection was established */
  readonly connectedAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Messages received on this connection */
  messagesReceived: number;
  /** Messages sent on this connection */
  messagesSent: number;
  /** Errors on this connection */
  errors: number;
}

/** MLLP server configuration */
export interface MllpServerConfig {
  /** TCP port to listen on (default: 2575) */
  port: number;
  /** Host to bind to (default: "0.0.0.0") */
  host: string;
  /** Maximum concurrent connections (default: 100) */
  maxConnections: number;
  /** Idle connection timeout in ms (default: 300000 = 5 min) */
  idleTimeoutMs: number;
  /** Maximum message size in bytes (default: 1MB) */
  maxMessageSize: number;
  /** Enable TLS (default: false) */
  tls: boolean;
  /** TLS certificate path (if tls=true) */
  tlsCertPath?: string;
  /** TLS key path (if tls=true) */
  tlsKeyPath?: string;
}

/** MLLP client configuration */
export interface MllpClientConfig {
  /** Remote host */
  host: string;
  /** Remote port */
  port: number;
  /** Connection timeout in ms (default: 10000) */
  connectTimeoutMs: number;
  /** Response timeout in ms (default: 30000) */
  responseTimeoutMs: number;
  /** Reconnection attempts (default: 3) */
  maxReconnectAttempts: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  reconnectBaseDelayMs: number;
  /** Enable TLS (default: false) */
  tls: boolean;
}

/* ------------------------------------------------------------------ */
/*  Engine Types                                                       */
/* ------------------------------------------------------------------ */

/** Handler for received HL7v2 messages */
export type MessageHandler = (message: Hl7Message, connection: MllpConnection) => Promise<Hl7Ack>;

/** HL7v2 Engine status */
export interface Hl7EngineStatus {
  /** Whether the engine is running */
  readonly running: boolean;
  /** Whether the MLLP server is listening */
  readonly listening: boolean;
  /** Server port */
  readonly port: number;
  /** Active connections count */
  readonly activeConnections: number;
  /** Total messages received since start */
  readonly totalMessagesReceived: number;
  /** Total messages sent since start */
  readonly totalMessagesSent: number;
  /** Total errors since start */
  readonly totalErrors: number;
  /** Engine uptime in ms */
  readonly uptimeMs: number;
}

/* ------------------------------------------------------------------ */
/*  PHI-sensitive segment types                                        */
/* ------------------------------------------------------------------ */

/**
 * Segment types that may contain Protected Health Information.
 * These segments must be redacted in logs, audit trails, and error messages.
 */
export const PHI_SEGMENTS = new Set([
  'PID', // Patient Identification
  'NK1', // Next of Kin
  'GT1', // Guarantor
  'IN1', // Insurance 1
  'IN2', // Insurance 2
  'ACC', // Accident
  'PD1', // Patient Additional Demographics
  'DG1', // Diagnosis
  'PR1', // Procedures
  'AL1', // Allergy Information
  'OBX', // Observation/Result
  'NTE', // Notes and Comments (may contain clinical text)
]);

/** Check if a segment type contains PHI */
export function isPhiSegment(segmentName: string): boolean {
  return PHI_SEGMENTS.has(segmentName);
}
