/**
 * Edge Device Gateway -- Types
 *
 * Phase 379 (W21-P2): Core type definitions for the edge device gateway
 * subsystem. Covers gateway registration, uplink protocol, device observations,
 * and tunnel lifecycle.
 *
 * Pattern: follows telehealth/types.ts, imaging-devices.ts
 */

// ---------------------------------------------------------------------------
// Gateway Identity
// ---------------------------------------------------------------------------

export type GatewayStatus = 'registered' | 'online' | 'offline' | 'revoked';

export interface GatewayCertInfo {
  /** SHA-256 fingerprint of the client certificate */
  fingerprint: string;
  /** Certificate subject CN */
  cn: string;
  /** Certificate not-before (ISO 8601) */
  notBefore: string;
  /** Certificate not-after (ISO 8601) */
  notAfter: string;
}

export interface EdgeGateway {
  /** Opaque gateway ID (eg-XXXX) */
  id: string;
  /** Human-readable label */
  name: string;
  /** Tenant scope */
  tenantId: string;
  /** Facility code where gateway is deployed */
  facilityCode: string;
  /** Current lifecycle status */
  status: GatewayStatus;
  /** mTLS certificate metadata (populated after first handshake) */
  cert?: GatewayCertInfo;
  /** Software version reported by the gateway */
  firmwareVersion?: string;
  /** Protocol adapters loaded on this gateway */
  adapters: string[];
  /** Last heartbeat timestamp (ISO 8601) */
  lastHeartbeat?: string;
  /** Registration timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Uplink Message Envelope
// ---------------------------------------------------------------------------

export type UplinkMessageType = 'observation' | 'alarm' | 'heartbeat' | 'config_ack' | 'error';

export interface UplinkEnvelope {
  /** Message ID (idempotency key) */
  messageId: string;
  /** Gateway that sent this message */
  gatewayId: string;
  /** Message type discriminator */
  type: UplinkMessageType;
  /** Source protocol (hl7v2, astm, poct1a, sdc, dicom, raw) */
  sourceProtocol: string;
  /** Message payload (structure depends on type) */
  payload: Record<string, unknown>;
  /** Timestamp at the gateway (ISO 8601) */
  gatewayTimestamp: string;
  /** Timestamp at the server (ISO 8601, set on receipt) */
  serverTimestamp?: string;
}

// ---------------------------------------------------------------------------
// Device Observation (normalized)
// ---------------------------------------------------------------------------

export interface DeviceObservation {
  /** Observation ID */
  id: string;
  /** Source gateway */
  gatewayId: string;
  /** Device identifier (serial number or AE title) */
  deviceId: string;
  /** Patient identifier (DFN or MRN -- mapped, never raw from device) */
  patientId?: string;
  /** Observation code (LOINC preferred, vendor code if unmapped) */
  code: string;
  /** Code system (LOINC, vendor, local) */
  codeSystem: string;
  /** Observation value */
  value: string;
  /** Unit (UCUM preferred) */
  unit: string;
  /** Interpretation flag (N, H, HH, L, LL, A, C) */
  flag?: string;
  /** Reference range (e.g. "70-140") */
  referenceRange?: string;
  /** Specimen/body site (if applicable) */
  specimen?: string;
  /** Source protocol */
  sourceProtocol: string;
  /** Timestamp of observation */
  observedAt: string;
  /** Timestamp of ingest */
  ingestedAt: string;
  /** Normalization status */
  normalized: boolean;
  /** Tenant scope */
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Tunnel / Config Messages (downlink to gateway)
// ---------------------------------------------------------------------------

export interface GatewayConfig {
  /** Config version (monotonically increasing) */
  version: number;
  /** Polling interval for observations (ms) */
  observationIntervalMs: number;
  /** Heartbeat interval (ms) */
  heartbeatIntervalMs: number;
  /** Enabled adapters */
  enabledAdapters: string[];
  /** Device allowlist (serial numbers) -- empty = allow all */
  deviceAllowlist: string[];
  /** Rate limit: max observations per second */
  maxObservationsPerSecond: number;
}

export interface DownlinkMessage {
  /** Message type */
  type: 'config_push' | 'restart' | 'update_firmware' | 'revoke';
  /** Payload */
  payload: Record<string, unknown>;
  /** Timestamp */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Gateway Health
// ---------------------------------------------------------------------------

export interface GatewayHealthSnapshot {
  gatewayId: string;
  status: GatewayStatus;
  uplinkLatencyMs: number | null;
  messageCount24h: number;
  errorCount24h: number;
  lastHeartbeat: string | null;
  adapters: string[];
  firmwareVersion: string | null;
}
