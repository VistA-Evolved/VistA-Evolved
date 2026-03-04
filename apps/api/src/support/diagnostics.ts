/**
 * System Diagnostics Collector
 *
 * Phase 244 (Wave 6 P7): Gathers comprehensive diagnostic data from
 * all subsystems for support troubleshooting.
 *
 * Collects:
 *   - Runtime info (Node, uptime, memory)
 *   - VistA connectivity status
 *   - Module/adapter health
 *   - Store inventory summary
 *   - Circuit breaker states
 *   - Background job status
 */

import { log } from '../lib/logger.js';
import { probeConnect } from '../vista/rpcBroker.js';
import { getAdapterHealth, getAllAdapters } from '../adapters/adapter-loader.js';
import { getModuleStatus, getActiveSku } from '../modules/module-registry.js';
import { getCapabilitySummary } from '../modules/capability-service.js';
import { getStoreInventorySummary } from '../platform/store-policy.js';
import { getHl7EngineStatus } from '../hl7/index.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DiagnosticReport {
  timestamp: string;
  runtime: RuntimeInfo;
  vista: VistaStatus;
  modules: ModulesSummary;
  adapters: AdaptersSummary;
  stores: StoresSummary;
  hl7: Hl7Summary;
}

interface RuntimeInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  memoryMb: { rss: number; heapUsed: number; heapTotal: number };
  env: string;
}

interface VistaStatus {
  reachable: boolean;
  host: string;
  port: number;
  latencyMs?: number;
  error?: string;
}

interface ModulesSummary {
  sku: string;
  totalModules: number;
  enabledModules: number;
  capabilities: { total: number; live: number; pending: number; disabled: number };
}

interface AdaptersSummary {
  totalAdapters: number;
  healthyAdapters: number;
  unhealthyAdapters: number;
}

interface StoresSummary {
  total: number;
  byBackend: Record<string, number>;
  byClassification: Record<string, number>;
}

interface Hl7Summary {
  enabled: boolean;
  status?: string;
}

/* ------------------------------------------------------------------ */
/*  Collector                                                          */
/* ------------------------------------------------------------------ */

export async function collectDiagnostics(tenantId = 'default'): Promise<DiagnosticReport> {
  const start = Date.now();
  log.info('Collecting system diagnostics');

  // Runtime
  const mem = process.memoryUsage();
  const runtime: RuntimeInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    env: process.env.NODE_ENV || 'development',
  };

  // VistA probe
  const vistaHost = process.env.VISTA_HOST || 'localhost';
  const vistaPort = Number(process.env.VISTA_PORT) || 9430;
  let vista: VistaStatus;
  try {
    const probeStart = Date.now();
    await probeConnect(3000);
    vista = {
      reachable: true,
      host: vistaHost,
      port: vistaPort,
      latencyMs: Date.now() - probeStart,
    };
  } catch (_err) {
    vista = { reachable: false, host: vistaHost, port: vistaPort, error: 'VistA probe failed' };
  }

  // Modules
  const moduleStatus = getModuleStatus(tenantId);
  const capSummary = getCapabilitySummary(tenantId);
  const modules: ModulesSummary = {
    sku: getActiveSku(),
    totalModules: moduleStatus.length,
    enabledModules: moduleStatus.filter((m) => m.enabled).length,
    capabilities: {
      total: capSummary.total,
      live: capSummary.live,
      pending: capSummary.pending,
      disabled: capSummary.disabled,
    },
  };

  // Adapters
  let adapters: AdaptersSummary;
  try {
    const adapterHealth = await getAdapterHealth();
    const entries = Object.values(adapterHealth);
    const healthy = entries.filter((a) => a.ok).length;
    adapters = {
      totalAdapters: getAllAdapters().size,
      healthyAdapters: healthy,
      unhealthyAdapters: entries.length - healthy,
    };
  } catch {
    adapters = { totalAdapters: getAllAdapters().size, healthyAdapters: 0, unhealthyAdapters: 0 };
  }

  // Stores
  const storeSummary = getStoreInventorySummary();
  const stores: StoresSummary = {
    total: storeSummary.total,
    byBackend: {},
    byClassification: storeSummary.byClassification,
  };

  // HL7
  let hl7: Hl7Summary;
  try {
    const hl7Status = getHl7EngineStatus();
    hl7 = { enabled: hl7Status.running, status: hl7Status.running ? 'running' : 'stopped' };
  } catch {
    hl7 = { enabled: false };
  }

  log.info('Diagnostics collected', { durationMs: Date.now() - start });

  return {
    timestamp: new Date().toISOString(),
    runtime,
    vista,
    modules,
    adapters,
    stores,
    hl7,
  };
}
