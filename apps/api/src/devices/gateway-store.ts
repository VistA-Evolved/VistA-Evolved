/**
 * Edge Device Gateway — Gateway Store
 *
 * Phase 379 (W21-P2): In-memory store for edge gateway registrations,
 * heartbeats, and uplink message buffering.
 *
 * Pattern: follows telehealth/room-store.ts, imaging-worklist.ts
 *
 * Migration plan:
 * 1. In-memory Map (current)
 * 2. PG-backed via gateway repo (future)
 * 3. VistA device integration files (future)
 * 4. Full HL7 ADT feed for device association (future)
 */

import * as crypto from 'node:crypto';
import type {
  EdgeGateway,
  GatewayStatus,
  GatewayConfig,
  UplinkEnvelope,
  DeviceObservation,
  GatewayHealthSnapshot,
} from './types.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_GATEWAYS = parseInt(process.env.MAX_EDGE_GATEWAYS || '200', 10);
const MAX_OBSERVATIONS = parseInt(process.env.MAX_DEVICE_OBSERVATIONS || '50000', 10);
const MAX_UPLINK_BUFFER = parseInt(process.env.MAX_UPLINK_BUFFER || '10000', 10);
const HEARTBEAT_TIMEOUT_MS = parseInt(process.env.GATEWAY_HEARTBEAT_TIMEOUT_MS || '120000', 10);
const CLEANUP_INTERVAL_MS = parseInt(process.env.GATEWAY_CLEANUP_INTERVAL_MS || '60000', 10);

const DEFAULT_TENANT = 'default';

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/** Gateway registrations keyed by gateway ID */
const gateways = new Map<string, EdgeGateway>();

/** Uplink message buffer (ring buffer, FIFO eviction) */
const uplinkBuffer: UplinkEnvelope[] = [];

/** Device observations keyed by observation ID */
const observations = new Map<string, DeviceObservation>();

/** Per-gateway config keyed by gateway ID */
const gatewayConfigs = new Map<string, GatewayConfig>();

/** Per-gateway message counters (rolling 24h window) */
const messageCounters = new Map<string, { count: number; errors: number; windowStart: number }>();

/** Idempotency set for uplink messages (messageId -> timestamp) */
const uplinkIdempotency = new Map<string, number>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function now(): string {
  return new Date().toISOString();
}

function evictOldest<K, V>(map: Map<K, V>, max: number): void {
  while (map.size > max) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
}

// ---------------------------------------------------------------------------
// Gateway CRUD
// ---------------------------------------------------------------------------

export function registerGateway(
  name: string,
  facilityCode: string,
  adapters: string[],
  tenantId: string = DEFAULT_TENANT
): EdgeGateway {
  evictOldest(gateways, MAX_GATEWAYS - 1);
  const id = generateId('eg');
  const ts = now();
  const gw: EdgeGateway = {
    id,
    name,
    tenantId,
    facilityCode,
    status: 'registered',
    adapters,
    createdAt: ts,
    updatedAt: ts,
  };
  gateways.set(id, gw);
  return gw;
}

export function getGateway(id: string): EdgeGateway | undefined {
  return gateways.get(id);
}

export function listGateways(tenantId?: string): EdgeGateway[] {
  const all = Array.from(gateways.values());
  return tenantId ? all.filter((g) => g.tenantId === tenantId) : all;
}

export function updateGatewayStatus(id: string, status: GatewayStatus): EdgeGateway | undefined {
  const gw = gateways.get(id);
  if (!gw) return undefined;
  gw.status = status;
  gw.updatedAt = now();
  return gw;
}

export function recordHeartbeat(id: string, firmwareVersion?: string): EdgeGateway | undefined {
  const gw = gateways.get(id);
  if (!gw) return undefined;
  gw.lastHeartbeat = now();
  gw.status = 'online';
  if (firmwareVersion) gw.firmwareVersion = firmwareVersion;
  gw.updatedAt = now();
  return gw;
}

export function revokeGateway(id: string): boolean {
  const gw = gateways.get(id);
  if (!gw) return false;
  gw.status = 'revoked';
  gw.updatedAt = now();
  return true;
}

export function deleteGateway(id: string): boolean {
  return gateways.delete(id);
}

// ---------------------------------------------------------------------------
// Gateway Config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: GatewayConfig = {
  version: 1,
  observationIntervalMs: 5000,
  heartbeatIntervalMs: 30000,
  enabledAdapters: ['hl7v2', 'astm'],
  deviceAllowlist: [],
  maxObservationsPerSecond: 100,
};

export function getGatewayConfig(gatewayId: string): GatewayConfig {
  return gatewayConfigs.get(gatewayId) || { ...DEFAULT_CONFIG };
}

export function setGatewayConfig(gatewayId: string, config: Partial<GatewayConfig>): GatewayConfig {
  const current = getGatewayConfig(gatewayId);
  const updated: GatewayConfig = {
    ...current,
    ...config,
    version: current.version + 1,
  };
  gatewayConfigs.set(gatewayId, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Uplink Ingest
// ---------------------------------------------------------------------------

export function ingestUplinkMessage(envelope: UplinkEnvelope): {
  accepted: boolean;
  reason?: string;
} {
  // Idempotency check
  if (uplinkIdempotency.has(envelope.messageId)) {
    return { accepted: false, reason: 'duplicate' };
  }

  // Gateway must exist and not be revoked
  const gw = gateways.get(envelope.gatewayId);
  if (!gw) return { accepted: false, reason: 'unknown_gateway' };
  if (gw.status === 'revoked') return { accepted: false, reason: 'gateway_revoked' };

  // Set server timestamp
  envelope.serverTimestamp = now();

  // Buffer the message
  uplinkBuffer.push(envelope);
  while (uplinkBuffer.length > MAX_UPLINK_BUFFER) {
    uplinkBuffer.shift();
  }

  // Track idempotency (1h TTL managed by cleanup)
  uplinkIdempotency.set(envelope.messageId, Date.now());

  // Update message counters
  const counter = messageCounters.get(envelope.gatewayId) || {
    count: 0,
    errors: 0,
    windowStart: Date.now(),
  };
  counter.count++;
  if (envelope.type === 'error') counter.errors++;
  messageCounters.set(envelope.gatewayId, counter);

  return { accepted: true };
}

export function getUplinkBuffer(gatewayId?: string, limit: number = 100): UplinkEnvelope[] {
  const filtered = gatewayId ? uplinkBuffer.filter((m) => m.gatewayId === gatewayId) : uplinkBuffer;
  return filtered.slice(-limit);
}

// ---------------------------------------------------------------------------
// Observation Store
// ---------------------------------------------------------------------------

export function storeObservation(obs: DeviceObservation): void {
  evictOldest(observations, MAX_OBSERVATIONS - 1);
  observations.set(obs.id, obs);
}

export function getObservation(id: string): DeviceObservation | undefined {
  return observations.get(id);
}

export function listObservations(opts: {
  gatewayId?: string;
  deviceId?: string;
  patientId?: string;
  tenantId?: string;
  limit?: number;
}): DeviceObservation[] {
  let results = Array.from(observations.values());
  if (opts.gatewayId) results = results.filter((o) => o.gatewayId === opts.gatewayId);
  if (opts.deviceId) results = results.filter((o) => o.deviceId === opts.deviceId);
  if (opts.patientId) results = results.filter((o) => o.patientId === opts.patientId);
  if (opts.tenantId) results = results.filter((o) => o.tenantId === opts.tenantId);
  return results.slice(-(opts.limit || 100));
}

// ---------------------------------------------------------------------------
// Health Snapshot
// ---------------------------------------------------------------------------

export function getGatewayHealth(gatewayId: string): GatewayHealthSnapshot | null {
  const gw = gateways.get(gatewayId);
  if (!gw) return null;

  const counter = messageCounters.get(gatewayId);
  return {
    gatewayId,
    status: gw.status,
    uplinkLatencyMs: null, // Computed from heartbeat round-trip when WebSocket is wired
    messageCount24h: counter?.count || 0,
    errorCount24h: counter?.errors || 0,
    lastHeartbeat: gw.lastHeartbeat || null,
    adapters: gw.adapters,
    firmwareVersion: gw.firmwareVersion || null,
  };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

function runCleanup(): void {
  const cutoff = Date.now();

  // Mark gateways as offline if heartbeat timed out
  for (const [, gw] of gateways) {
    if (
      gw.status === 'online' &&
      gw.lastHeartbeat &&
      cutoff - new Date(gw.lastHeartbeat).getTime() > HEARTBEAT_TIMEOUT_MS
    ) {
      gw.status = 'offline';
      gw.updatedAt = now();
    }
  }

  // Evict old idempotency entries (>1h)
  const idempotencyCutoff = cutoff - 3600000;
  for (const [key, ts] of uplinkIdempotency) {
    if (ts < idempotencyCutoff) uplinkIdempotency.delete(key);
  }

  // Reset 24h counters if window expired
  const counterCutoff = cutoff - 86400000;
  for (const [key, counter] of messageCounters) {
    if (counter.windowStart < counterCutoff) {
      messageCounters.set(key, { count: 0, errors: 0, windowStart: cutoff });
    }
  }
}

export function startGatewayCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopGatewayCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Store Stats (for posture/diagnostics)
// ---------------------------------------------------------------------------

export function getStoreStats(): {
  gateways: number;
  observations: number;
  uplinkBuffer: number;
  configs: number;
  idempotencyKeys: number;
} {
  return {
    gateways: gateways.size,
    observations: observations.size,
    uplinkBuffer: uplinkBuffer.length,
    configs: gatewayConfigs.size,
    idempotencyKeys: uplinkIdempotency.size,
  };
}
