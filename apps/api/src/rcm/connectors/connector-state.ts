/**
 * Connector State -- Phase 82: RCM Adapter Expansion v2
 *
 * Provides an honest, normalized view of every connector's health
 * and readiness. No fake "connected" state -- connectors are probed
 * and the result is one of:
 *
 *   connected   -- health check passed recently
 *   degraded    -- health check slow or partial success
 *   disconnected -- health check failed or connector not configured
 *   pending     -- never probed / first boot
 *
 * Probes are rate-limited (max 1/minute per connector) to avoid
 * hammering external payer endpoints.
 */

import { getAllConnectors, type RcmConnector } from './types.js';
import { getAllPayerAdapters, type PayerAdapter } from '../adapters/payer-adapter.js';
import { log } from '../../lib/logger.js';

/* -- State Model --------------------------------------------- */

export type ConnectorHealthState = 'connected' | 'degraded' | 'disconnected' | 'pending';

export interface ConnectorStateEntry {
  connectorId: string;
  connectorName: string;
  state: ConnectorHealthState;
  lastProbeAt: string | null;
  lastProbeLatencyMs: number | null;
  lastError: string | null;
  supportedModes: string[];
  pendingTarget?: {
    reason: string;
    configRequired: string[];
    migrationPath: string;
  };
}

export interface AdapterStateEntry {
  adapterId: string;
  adapterName: string;
  state: ConnectorHealthState;
  lastProbeAt: string | null;
  lastProbeLatencyMs: number | null;
  lastError: string | null;
  supportedModes: string[];
  enabled: boolean;
  rateLimits: {
    eligibilityPerHour: number;
    claimStatusPerHour: number;
    submissionsPerHour: number;
  };
  pendingTarget?: {
    reason: string;
    configRequired: string[];
    migrationPath: string;
  };
}

/* -- Probe Cache --------------------------------------------- */

const PROBE_COOLDOWN_MS = 60_000; // 1 minute between probes per connector
const DEGRADED_LATENCY_MS = 5_000; // >5s = degraded

const probeCache = new Map<
  string,
  {
    state: ConnectorHealthState;
    probedAt: number;
    latencyMs: number;
    error: string | null;
  }
>();

/* -- Probe Functions ----------------------------------------- */

async function probeConnector(connector: RcmConnector): Promise<ConnectorStateEntry> {
  const cached = probeCache.get(connector.id);
  const now = Date.now();

  // Rate-limit probes
  if (cached && now - cached.probedAt < PROBE_COOLDOWN_MS) {
    return {
      connectorId: connector.id,
      connectorName: connector.name,
      state: cached.state,
      lastProbeAt: new Date(cached.probedAt).toISOString(),
      lastProbeLatencyMs: cached.latencyMs,
      lastError: cached.error,
      supportedModes: connector.supportedModes,
    };
  }

  const start = Date.now();
  try {
    const result = await connector.healthCheck();
    const latencyMs = Date.now() - start;

    let state: ConnectorHealthState;
    if (result.healthy) {
      state = latencyMs > DEGRADED_LATENCY_MS ? 'degraded' : 'connected';
    } else {
      state = 'disconnected';
    }

    probeCache.set(connector.id, {
      state,
      probedAt: Date.now(),
      latencyMs,
      error: result.healthy ? null : (result.details ?? 'Health check returned unhealthy'),
    });

    return {
      connectorId: connector.id,
      connectorName: connector.name,
      state,
      lastProbeAt: new Date().toISOString(),
      lastProbeLatencyMs: latencyMs,
      lastError: result.healthy ? null : (result.details ?? null),
      supportedModes: connector.supportedModes,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const latencyMs = Date.now() - start;

    probeCache.set(connector.id, {
      state: 'disconnected',
      probedAt: Date.now(),
      latencyMs,
      error: errMsg,
    });

    return {
      connectorId: connector.id,
      connectorName: connector.name,
      state: 'disconnected',
      lastProbeAt: new Date().toISOString(),
      lastProbeLatencyMs: latencyMs,
      lastError: errMsg,
      supportedModes: connector.supportedModes,
      pendingTarget: {
        reason: `Connector health check failed: ${errMsg}`,
        configRequired: [
          `${connector.id.toUpperCase()}_ENDPOINT`,
          `${connector.id.toUpperCase()}_API_KEY`,
        ],
        migrationPath: `Configure ${connector.name} connection parameters in .env.local`,
      },
    };
  }
}

async function probeAdapter(adapter: PayerAdapter): Promise<AdapterStateEntry> {
  const cached = probeCache.get(`adapter:${adapter.config.id}`);
  const now = Date.now();

  if (cached && now - cached.probedAt < PROBE_COOLDOWN_MS) {
    return {
      adapterId: adapter.config.id,
      adapterName: adapter.config.name,
      state: cached.state,
      lastProbeAt: new Date(cached.probedAt).toISOString(),
      lastProbeLatencyMs: cached.latencyMs,
      lastError: cached.error,
      supportedModes: adapter.config.supportedModes,
      enabled: adapter.config.enabled,
      rateLimits: adapter.config.rateLimits,
    };
  }

  if (!adapter.config.enabled) {
    return {
      adapterId: adapter.config.id,
      adapterName: adapter.config.name,
      state: 'disconnected',
      lastProbeAt: new Date().toISOString(),
      lastProbeLatencyMs: 0,
      lastError: 'Adapter disabled',
      supportedModes: adapter.config.supportedModes,
      enabled: false,
      rateLimits: adapter.config.rateLimits,
      pendingTarget: {
        reason: 'Adapter is disabled in current configuration',
        configRequired: adapter.config.requiredEnvVars ?? [],
        migrationPath: `Set environment variables and enable adapter ${adapter.config.id}`,
      },
    };
  }

  const start = Date.now();
  try {
    const result = await adapter.healthCheck();
    const latencyMs = Date.now() - start;

    let state: ConnectorHealthState;
    if (result.healthy) {
      state = latencyMs > DEGRADED_LATENCY_MS ? 'degraded' : 'connected';
    } else {
      state = 'disconnected';
    }

    probeCache.set(`adapter:${adapter.config.id}`, {
      state,
      probedAt: Date.now(),
      latencyMs,
      error: result.healthy ? null : (result.details ?? 'Unhealthy'),
    });

    return {
      adapterId: adapter.config.id,
      adapterName: adapter.config.name,
      state,
      lastProbeAt: new Date().toISOString(),
      lastProbeLatencyMs: latencyMs,
      lastError: result.healthy ? null : (result.details ?? null),
      supportedModes: adapter.config.supportedModes,
      enabled: adapter.config.enabled,
      rateLimits: adapter.config.rateLimits,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    probeCache.set(`adapter:${adapter.config.id}`, {
      state: 'disconnected',
      probedAt: Date.now(),
      latencyMs: Date.now() - start,
      error: errMsg,
    });

    return {
      adapterId: adapter.config.id,
      adapterName: adapter.config.name,
      state: 'disconnected',
      lastProbeAt: new Date().toISOString(),
      lastProbeLatencyMs: Date.now() - start,
      lastError: errMsg,
      supportedModes: adapter.config.supportedModes,
      enabled: adapter.config.enabled,
      rateLimits: adapter.config.rateLimits,
      pendingTarget: {
        reason: `Adapter health check failed: ${errMsg}`,
        configRequired: adapter.config.requiredEnvVars ?? [],
        migrationPath: `Configure ${adapter.config.name} and verify connectivity`,
      },
    };
  }
}

/* -- Public API ---------------------------------------------- */

/**
 * Get the honest state of all registered connectors.
 * Probes are cached for 60s per connector.
 */
export async function getAllConnectorStates(): Promise<ConnectorStateEntry[]> {
  const connectors = getAllConnectors();
  const entries: ConnectorStateEntry[] = [];

  for (const connector of connectors.values()) {
    try {
      entries.push(await probeConnector(connector));
    } catch (_err) {
      log.warn('Connector probe failed', { connectorId: connector.id });
      entries.push({
        connectorId: connector.id,
        connectorName: connector.name,
        state: 'pending',
        lastProbeAt: null,
        lastProbeLatencyMs: null,
        lastError: 'Probe threw unexpectedly',
        supportedModes: connector.supportedModes,
      });
    }
  }

  return entries;
}

/**
 * Get the honest state of all registered payer adapters.
 */
export async function getAllAdapterStates(): Promise<AdapterStateEntry[]> {
  const adapters = getAllPayerAdapters();
  const entries: AdapterStateEntry[] = [];

  for (const adapter of adapters.values()) {
    try {
      entries.push(await probeAdapter(adapter));
    } catch (_err) {
      log.warn('Adapter probe failed', { adapterId: adapter.config.id });
      entries.push({
        adapterId: adapter.config.id,
        adapterName: adapter.config.name,
        state: 'pending',
        lastProbeAt: null,
        lastProbeLatencyMs: null,
        lastError: 'Probe threw unexpectedly',
        supportedModes: adapter.config.supportedModes,
        enabled: adapter.config.enabled,
        rateLimits: adapter.config.rateLimits,
      });
    }
  }

  return entries;
}

/**
 * Get combined summary of all connector + adapter health.
 */
export async function getConnectorStateSummary(): Promise<{
  connectors: ConnectorStateEntry[];
  adapters: AdapterStateEntry[];
  summary: {
    totalConnectors: number;
    connected: number;
    degraded: number;
    disconnected: number;
    pending: number;
    totalAdapters: number;
    adaptersEnabled: number;
    adaptersHealthy: number;
  };
}> {
  const [connectors, adapters] = await Promise.all([
    getAllConnectorStates(),
    getAllAdapterStates(),
  ]);

  const connectorCounts = { connected: 0, degraded: 0, disconnected: 0, pending: 0 };
  for (const c of connectors) {
    connectorCounts[c.state]++;
  }

  return {
    connectors,
    adapters,
    summary: {
      totalConnectors: connectors.length,
      connected: connectorCounts.connected,
      degraded: connectorCounts.degraded,
      disconnected: connectorCounts.disconnected,
      pending: connectorCounts.pending,
      totalAdapters: adapters.length,
      adaptersEnabled: adapters.filter((a) => a.enabled).length,
      adaptersHealthy: adapters.filter((a) => a.state === 'connected').length,
    },
  };
}

/** Reset probe cache (testing). */
export function resetProbeCache(): void {
  probeCache.clear();
}
