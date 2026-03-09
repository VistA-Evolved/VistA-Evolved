/**
 * Server — Inline Routes
 *
 * Phase 173: Extracted from index.ts — all route handlers that were defined
 * directly in the monolithic file (health, ready, version, metrics, audit,
 * admin, vista/* clinical routes).
 *
 * These are routes that were NOT registered as Fastify plugins but were
 * server.get/server.post calls directly in index.ts.
 */

import type { FastifyInstance } from 'fastify';

import { probeConnect } from '../vista/rpcBroker.js';
import { validateCredentials } from '../vista/config.js';
import { connect, disconnect, callRpc, callRpcWithList, getDuz } from '../vista/rpcBrokerClient.js';
import { getPoolStats } from '../vista/rpcConnectionPool.js';
import { isRedisAvailable } from '../lib/redis.js';
import { requireSession } from '../auth/auth-routes.js';
import { isTracingEnabled } from '../telemetry/tracing.js';
import {
  getPrometheusMetrics,
  getMetricsContentType,
  circuitBreakerState as cbStateGauge,
} from '../telemetry/metrics.js';
import { audit, queryAuditEvents, getAuditStats } from '../lib/audit.js';
import {
  getRpcHealthSummary,
  getCircuitBreakerStats,
  resetCircuitBreaker,
  forceOpenCircuitBreaker,
  invalidateCache,
  safeCallRpc,
} from '../lib/rpc-resilience.js';
import { getIntegrationHealthSummary } from '../config/integration-registry.js';
import { isPgConfigured, pgHealthCheck } from '../platform/pg/index.js';
import { getFullRpcInventory } from '../vista/rpcRegistry.js';
import { queryUnifiedAudit, getUnifiedAuditStats } from '../lib/unified-audit.js';
import {
  getConnectorCbStats,
  resetConnectorCb,
  resetAllConnectorCbs,
} from '../rcm/connectors/connector-resilience.js';
import {
  getFakeSuccessViolations,
  getFakeSuccessViolationCount,
  getNoFakeSuccessAuditReport,
} from '../middleware/no-fake-success.js';
import { safeErr } from '../lib/safe-error.js';
import { createDraft } from '../routes/write-backs.js';

/** Extract audit actor from request session. */
function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: 'system' };
}

function isInlineRpcMissingLine(line: string): boolean {
  return (
    line.includes("doesn't exist") ||
    line.includes('doesn\u0027t exist') ||
    line.startsWith('CRemote') ||
    line.includes('not found')
  );
}

function hasInlineBrokerExecutionError(lines: string[]): boolean {
  return lines.some((line) => /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|Remote Procedure/i.test(line));
}

function parseAllergyRows(lines: string[]) {
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split('^');
      const id = parts[0]?.trim();
      const allergen = parts[1]?.trim() || '';
      const severity = parts[2]?.trim() || '';
      const reactions = parts[3]?.trim() || '';
      if (!id) return null;
      return { id, allergen, severity, reactions };
    })
    .filter((row) => row !== null);
}

/* RPC catalog cache */
let rpcCatalogCache: { data: any; ts: number } | null = null;
const RPC_CATALOG_TTL = 60_000;

/* Vital type abbreviation → IEN in file 120.51 (WorldVistA defaults) */
const VITAL_TYPE_IEN: Record<string, number> = {
  BP: 1,
  T: 2,
  R: 3,
  P: 5,
  HT: 8,
  WT: 9,
  PO2: 21,
  PN: 22,
};
const VALID_VITAL_TYPES = Object.keys(VITAL_TYPE_IEN);

/* Quick orders available in WorldVistA Docker */
const QUICK_ORDERS: { ien: number; name: string; keywords: string[] }[] = [
  { ien: 1638, name: 'ASPIRIN CHEW', keywords: ['ASPIRIN CHEW', 'ASPIRIN CHEWABLE', 'ASA CHEW'] },
  {
    ien: 1639,
    name: 'ASPIRIN TAB EC',
    keywords: ['ASPIRIN TAB', 'ASPIRIN EC', 'ASA TAB', 'ASPIRIN'],
  },
  { ien: 1640, name: 'ATENOLOL TAB', keywords: ['ATENOLOL'] },
  { ien: 1641, name: 'ATORVASTATIN TAB', keywords: ['ATORVASTATIN', 'LIPITOR'] },
  { ien: 1642, name: 'BENAZEPRIL TAB', keywords: ['BENAZEPRIL'] },
  { ien: 1643, name: 'CANDESARTAN TAB', keywords: ['CANDESARTAN'] },
  { ien: 1644, name: 'CAPTOPRIL TAB', keywords: ['CAPTOPRIL'] },
  { ien: 1645, name: 'CARVEDILOL TAB', keywords: ['CARVEDILOL'] },
  { ien: 1646, name: 'ENALAPRIL TAB', keywords: ['ENALAPRIL'] },
  { ien: 1658, name: 'FLUVASTATIN CAP', keywords: ['FLUVASTATIN CAP'] },
  {
    ien: 1647,
    name: 'FLUVASTATIN XL TAB',
    keywords: ['FLUVASTATIN TAB', 'FLUVASTATIN XL', 'FLUVASTATIN'],
  },
  { ien: 1648, name: 'LISINOPRIL TAB', keywords: ['LISINOPRIL'] },
  { ien: 1649, name: 'LOSARTAN TAB', keywords: ['LOSARTAN'] },
  { ien: 1650, name: 'LOVASTATIN TAB', keywords: ['LOVASTATIN'] },
  { ien: 1651, name: 'METOPROLOL TAB', keywords: ['METOPROLOL'] },
  { ien: 1652, name: 'NADOLOL TAB', keywords: ['NADOLOL'] },
  { ien: 1653, name: 'CLOPIDOGREL TAB', keywords: ['CLOPIDOGREL', 'PLAVIX'] },
  { ien: 1654, name: 'PRAVASTATIN TAB', keywords: ['PRAVASTATIN'] },
  { ien: 1655, name: 'PROPRANOLOL TAB', keywords: ['PROPRANOLOL'] },
  { ien: 1656, name: 'ROSUVASTATIN TAB', keywords: ['ROSUVASTATIN', 'CRESTOR'] },
  { ien: 1657, name: 'SIMVASTATIN TAB', keywords: ['SIMVASTATIN', 'ZOCOR'] },
  { ien: 1628, name: 'WARFARIN', keywords: ['WARFARIN', 'COUMADIN'] },
];

/** Find the best-matching quick order for a drug name. */
function matchQuickOrder(drug: string): (typeof QUICK_ORDERS)[number] | null {
  const upper = drug.toUpperCase().trim();
  for (const qo of QUICK_ORDERS) {
    for (const kw of qo.keywords) {
      if (upper === kw) return qo;
    }
  }
  for (const qo of QUICK_ORDERS) {
    for (const kw of qo.keywords) {
      if (upper.includes(kw) || kw.includes(upper)) return qo;
    }
  }
  return null;
}

function formatVistaDateTime(value: string): string {
  const input = (value || '').trim();
  if (!input || input.includes('-') || input.length < 7) return input;
  const [datePart, timePart] = input.split('.');
  if (datePart.length < 7) return input;
  const year = parseInt(datePart.substring(0, 3), 10) + 1700;
  const month = datePart.substring(3, 5);
  const day = datePart.substring(5, 7);
  let output = `${year}-${month}-${day}`;
  if (timePart && timePart.length >= 4) {
    output += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
  }
  return output;
}

function nonEmptyLines(lines: string[]): string[] {
  return lines.filter((line) => line.trim().length > 0);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasVistaExecutionError(lines: string[]): boolean {
  return lines.some((line) => /M  ERROR=|%YDB-E-|LVUNDEF/i.test(line));
}

function responseMentionsSurgeryCase(lines: string[], caseId: string): boolean {
  return lines.some(
    (line) =>
      line.includes(`${caseId};SRF(`) || line.includes(`Case #: ${caseId}`) || line.startsWith(`${caseId}^`)
  );
}

function normalizeMedicationOrderText(value: string | undefined): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMedicationOrderDetail(lines: string[]): {
  displayGroup: string;
  packageRef?: string;
  textFromDetail?: string;
} {
  const metaLine = lines.find((line) => line.startsWith('~'));
  const textFromDetail = lines
    .filter((line) => line.startsWith('t'))
    .map((line) => normalizeMedicationOrderText(line.slice(1)))
    .filter(Boolean)
    .join(' ');
  const parts = metaLine ? metaLine.slice(1).split('^') : [];
  const packageCandidate = parts[parts.length - 1]?.trim() || '';
  return {
    displayGroup: parts[1]?.trim() || '',
    packageRef: /^[A-Z0-9]{2,8}$/.test(packageCandidate) ? packageCandidate : undefined,
    textFromDetail: textFromDetail || undefined,
  };
}

function formatProblemOnsetFromFileMan(onsetFm?: string): string | undefined {
  if (!onsetFm || onsetFm.length < 3 || !/^\d+/.test(onsetFm)) return undefined;

  const year = parseInt(onsetFm.substring(0, 3), 10) + 1700;
  const month = onsetFm.length >= 5 ? onsetFm.substring(3, 5) : '';
  const day = onsetFm.length >= 7 ? onsetFm.substring(5, 7) : '';

  if (month && month !== '00' && day && day !== '00') {
    return `${year}-${month}-${day}`;
  }
  if (month && month !== '00') {
    return `${year}-${month}`;
  }
  return String(year);
}

function inferMedicationOrderType(
  packageRef: string | undefined,
  displayGroup: string | undefined,
  text: string
): string | undefined {
  const signal = `${packageRef || ''} ${displayGroup || ''} ${text}`.toUpperCase();
  if (/PSO|PSJ|MED|TABLET|CAP|INJ|PATCH|CREAM|REFILL|RX/.test(signal)) return 'med';
  if (/LR|LAB|CBC|BMP|CMP|CHEM|CULTURE|HEMOGLOBIN|PLATELET|PANEL/.test(signal)) return 'lab';
  if (/RA|RAD|IMAG|XRAY|X-RAY|MRI|CT|ULTRASOUND|MAMMO|MAG/.test(signal)) return 'imaging';
  if (/GMRC|CONSULT|REFERRAL|SERVICE/.test(signal)) return 'consult';
  return undefined;
}

function normalizeMedicationOrderStatus(rawStatus: string | undefined, displayText?: string): string {
  if ((displayText || '').toUpperCase().includes('*UNSIGNED*')) return 'unsigned';
  const normalized = rawStatus?.trim().toLowerCase();
  return normalized || 'active';
}

async function buildMedicationFallbackFromOrders(dfn: string): Promise<{
  results: Array<{ id: string; name: string; sig: string; status: string }>;
  rpcUsed: string[];
}> {
  const orderLines = await safeCallRpc('ORWORR AGET', [dfn, '2', '', '', '']);
  const rpcUsedSet = new Set<string>(['ORWORR AGET']);
  const meds = new Map<string, { id: string; name: string; sig: string; status: string }>();

  for (const line of orderLines) {
    if (!line || line.startsWith('-1')) continue;
    const parts = line.split('^');
    const orderIen = parts[0]?.trim() || '';
    if (!orderIen) continue;

    let displayGroup = parts[1]?.trim() || '';
    let packageRef: string | undefined;
    let drugName = normalizeMedicationOrderText(parts[3]);
    let sig = '';
    let detailText = '';

    try {
      const detailLines = await safeCallRpc('ORWORR GETBYIFN', [orderIen]);
      if (detailLines.length > 0 && !detailLines[0]?.startsWith('-1')) {
        const detail = parseMedicationOrderDetail(detailLines);
        displayGroup = detail.displayGroup || displayGroup;
        packageRef = detail.packageRef;
        detailText = detail.textFromDetail || '';
        rpcUsedSet.add('ORWORR GETBYIFN');
      }
    } catch {
      // Keep order row truthful even if enrichment fails.
    }

    try {
      const txtLines = await safeCallRpc('ORWORR GETTXT', [orderIen]);
      const normalizedTxt = txtLines.map((entry) => normalizeMedicationOrderText(entry)).filter(Boolean);
      if (normalizedTxt.length > 0 && !normalizedTxt[0].startsWith('-1')) {
        drugName = normalizedTxt[0] || drugName;
        sig = normalizedTxt.slice(1).join(' ');
        detailText = normalizedTxt.join(' ');
        rpcUsedSet.add('ORWORR GETTXT');
      }
    } catch {
      // Keep fallback truthful even if GETTXT is unavailable.
    }

    const displayText = normalizeMedicationOrderText(detailText || drugName);
    if (inferMedicationOrderType(packageRef, displayGroup, displayText) !== 'med') continue;

    const baseOrderIen = orderIen.split(';')[0] || orderIen;
    meds.set(baseOrderIen, {
      id: baseOrderIen,
      name: drugName || detailText || `Medication order ${baseOrderIen}`,
      sig: sig || detailText,
      status: normalizeMedicationOrderStatus(parts[4], displayText),
    });
  }

  return { results: Array.from(meds.values()), rpcUsed: Array.from(rpcUsedSet) };
}

function parseSurgeryLinkedDocuments(lines: string[], selectedId: string) {
  const documents: Array<{ id: string; title: string; date?: string; status?: string; raw: string }> = [];
  const candidateIds: string[] = [];
  const seenDocs = new Set<string>();
  const seenCandidates = new Set<string>();

  const addCandidate = (value: string) => {
    if (!/^\d+$/.test(value) || seenCandidates.has(value)) return;
    seenCandidates.add(value);
    candidateIds.push(value);
  };

  addCandidate(selectedId);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.includes('^')) continue;
    const parts = line.split('^');
    const id = (parts[0] || '').trim();
    const title = (parts[1] || '').trim();
    const date = formatVistaDateTime(parts[2] || '');
    const status = (parts[6] || '').trim() || undefined;
    if (/^\d+$/.test(id)) addCandidate(id);
    if (!/^\d+$/.test(id) || !title) continue;
    const docKey = `${id}|${title}`;
    if (seenDocs.has(docKey)) continue;
    seenDocs.add(docKey);
    documents.push({ id, title, date: date || undefined, status, raw: rawLine });
  }

  return { documents, candidateIds };
}

async function reconnectSurgeryBroker(): Promise<void> {
  try {
    disconnect();
  } catch {
    // Best-effort cleanup before the next surgery RPC probe.
  }
}

/**
 * Register all inline route handlers that were previously in index.ts.
 */
export function registerInlineRoutes(server: FastifyInstance): void {
  // ── Health / Ready / Version / Metrics ────────────────────────────────

  server.get('/health', async () => {
    const cbStats = getCircuitBreakerStats();
    let platformPg: { configured: boolean; ok?: boolean; latencyMs?: number } = {
      configured: false,
    };
    if (isPgConfigured()) {
      try {
        const pgHealth = await pgHealthCheck();
        platformPg = { configured: true, ok: pgHealth.ok, latencyMs: pgHealth.latencyMs };
      } catch {
        platformPg = { configured: true, ok: false };
      }
    }
    return {
      ok: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: 'phase-101',
      circuitBreaker: cbStats.state,
      tracingEnabled: isTracingEnabled(),
      redis: isRedisAvailable() ? 'connected' : 'not-configured',
      platformPg,
    };
  });

  server.get('/ready', async () => {
    const cbStats = getCircuitBreakerStats();
    const cbVal = cbStats.state === 'closed' ? 0 : cbStats.state === 'open' ? 1 : 2;
    cbStateGauge.set(cbVal);
    try {
      await probeConnect();
      return {
        ok: cbStats.state !== 'open',
        vista: 'reachable',
        circuitBreaker: cbStats.state,
        uptime: process.uptime(),
      };
    } catch {
      return {
        ok: false,
        vista: 'unreachable',
        circuitBreaker: cbStats.state,
        uptime: process.uptime(),
      };
    }
  });

  server.get('/version', async () => ({
    ok: true,
    version: 'phase-16',
    commitSha: process.env.BUILD_SHA || 'dev',
    buildTime: process.env.BUILD_TIME || 'unknown',
    nodeVersion: process.version,
    uptime: process.uptime(),
  }));

  server.get('/metrics', async () => {
    const mem = process.memoryUsage();
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      process: {
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        pid: process.pid,
      },
      rpcHealth: getRpcHealthSummary(),
      integrations: getIntegrationHealthSummary('default'),
    };
  });

  server.get('/metrics/prometheus', async (_request, reply) => {
    const metrics = await getPrometheusMetrics();
    reply.header('Content-Type', getMetricsContentType());
    return reply.send(metrics);
  });

  // ── Audit ─────────────────────────────────────────────────────────────

  server.get('/audit/events', async (request) => {
    const { actionPrefix, actorDuz, patientDfn, since, limit } = request.query as any;
    const events = queryAuditEvents({
      actionPrefix,
      actorDuz,
      patientDfn,
      since,
      limit: limit ? Number(limit) : undefined,
    });
    return { ok: true, count: events.length, events };
  });

  server.get('/audit/stats', async () => {
    return { ok: true, ...getAuditStats() };
  });

  server.get('/audit/unified', async (request) => {
    const { sources, actionPrefix, actor, since, limit } = request.query as any;
    const entries = queryUnifiedAudit({
      sources: sources ? (String(sources).split(',') as any) : undefined,
      actionPrefix,
      actor,
      since,
      limit: limit ? Number(limit) : undefined,
    });
    return { ok: true, count: entries.length, entries };
  });

  server.get('/audit/unified/stats', async () => {
    return { ok: true, ...getUnifiedAuditStats() };
  });

  // ── Admin ─────────────────────────────────────────────────────────────

  server.get('/admin/connector-cbs', async () => {
    return { ok: true, connectors: getConnectorCbStats() };
  });

  server.post('/admin/connector-cb/reset', async (request) => {
    const { connectorId } = (request.body as any) || {};
    if (connectorId) {
      resetConnectorCb(connectorId);
      return { ok: true, reset: connectorId };
    }
    resetAllConnectorCbs();
    return { ok: true, reset: 'all' };
  });

  server.post('/admin/circuit-breaker/reset', async () => {
    resetCircuitBreaker();
    return { ok: true, state: getCircuitBreakerStats() };
  });

  /** Phase 503: Force-open CB for outage simulation. */
  server.post('/admin/circuit-breaker/force-open', async () => {
    forceOpenCircuitBreaker();
    return {
      ok: true,
      state: getCircuitBreakerStats(),
      message: 'Circuit breaker force-opened. POST /admin/circuit-breaker/reset to recover.',
    };
  });

  server.post('/admin/cache/invalidate', async (request) => {
    const { pattern } = (request.body as any) || {};
    const count = invalidateCache(pattern);
    return { ok: true, invalidated: count };
  });

  server.get('/admin/fake-success-violations', async () => {
    return {
      ok: true,
      count: getFakeSuccessViolationCount(),
      violations: getFakeSuccessViolations(),
    };
  });

  server.get('/admin/fake-success-audit', async () => {
    return { ok: true, report: getNoFakeSuccessAuditReport() };
  });

  // ── VistA connectivity ────────────────────────────────────────────────

  server.get('/vista/ping', async () => {
    try {
      await probeConnect();
      return { ok: true, vista: 'reachable', port: Number(process.env.VISTA_PORT || 9430) };
    } catch (err: any) {
      return {
        ok: false,
        vista: 'unreachable',
        error: safeErr(err),
        port: Number(process.env.VISTA_PORT || 9430),
      };
    }
  });

  server.get('/vista/pool/status', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const stats = getPoolStats();
    return {
      ok: true,
      pool: stats,
      legacyDuz: getDuz(),
    };
  });

  server.get('/vista/swap-boundary', async () => {
    const { activeSwapBoundary } = await import('../vista/swap-boundary.js');
    const boundary = activeSwapBoundary();
    return { ok: true, boundary };
  });

  // ── VistA RPC catalog + debug ─────────────────────────────────────────

  server.get('/vista/rpc-catalog', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    if (rpcCatalogCache && Date.now() - rpcCatalogCache.ts < RPC_CATALOG_TTL) {
      return rpcCatalogCache.data;
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      await connect();
      const lines = await callRpc('VE LIST RPCS', ['']);
      disconnect();
      const catalog = (Array.isArray(lines) ? lines : [lines])
        .filter((l: string) => l && l.includes('|'))
        .map((line: string) => {
          const [ien, name, tag, routine] = line.split('|');
          return {
            ien: ien?.trim(),
            name: name?.trim(),
            tag: tag?.trim(),
            routine: routine?.trim(),
            present: true,
          };
        })
        .filter((r) => r.name);
      const result = { ok: true, rpc: 'VE LIST RPCS', count: catalog.length, catalog };
      rpcCatalogCache = { data: result, ts: Date.now() };
      audit('config.rpc-catalog', 'success', auditActor(request), {
        detail: { count: catalog.length },
      });
      return result;
    } catch (err: any) {
      disconnect();
      if (
        err.message?.includes('not found') ||
        err.message?.includes('not registered') ||
        err.message?.includes('Application')
      ) {
        return {
          ok: true,
          rpc: 'VE LIST RPCS',
          count: 0,
          catalog: [],
          hint: 'VE LIST RPCS not installed. Run scripts/install-rpc-catalog.ps1',
        };
      }
      return { ok: false, rpc: 'VE LIST RPCS', error: safeErr(err) };
    }
  });

  server.get('/vista/rpc-debug/actions', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { ACTION_REGISTRY_DATA } = await import('../vista/rpcDebugData.js');
    return { ok: true, actions: ACTION_REGISTRY_DATA, count: ACTION_REGISTRY_DATA.length };
  });

  server.get('/vista/rpc-debug/registry', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { registry, exceptions } = getFullRpcInventory();
    return { ok: true, registry, exceptions, count: registry.length };
  });

  server.get('/vista/rpc-debug/coverage', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    try {
      const { readFileSync, existsSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const root = resolve(process.cwd(), '../..');
      const presentFile = resolve(root, 'data/vista/vista_instance/rpc_present.json');
      const missingFile = resolve(root, 'data/vista/vista_instance/rpc_missing_vs_vivian.json');
      const extraFile = resolve(root, 'data/vista/vista_instance/rpc_extra_vs_vivian.json');
      const result: any = { ok: true };
      if (existsSync(presentFile)) result.present = JSON.parse(readFileSync(presentFile, 'utf-8'));
      if (existsSync(missingFile)) result.missing = JSON.parse(readFileSync(missingFile, 'utf-8'));
      if (existsSync(extraFile)) result.extra = JSON.parse(readFileSync(extraFile, 'utf-8'));
      if (!result.present) result.hint = 'Run buildRpcCoverageMatrix.ts to generate coverage data';
      return result;
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
  });

  // ── VistA clinical routes ──────────────────────────────────────────────

  server.get('/vista/patient-search', async (request) => {
    const q = (request.query as any)?.q;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return { ok: false, error: 'Query too short', hint: 'Use ?q=SMI (minimum 2 characters)' };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }
    const RPC_NAME = 'ORWPT LIST ALL';
    try {
      const lines = await safeCallRpc(RPC_NAME, [q.trim().toUpperCase(), '1']);
      const results = lines
        .map((line) => {
          const parts = line.split('^');
          const dfn = parts[0]?.trim();
          const name = parts[1]?.trim();
          if (!dfn || !name) return null;
          // ORWPT LIST ALL may return additional fields (SSN, DOB) on some instances
          const ssn = parts[2]?.trim() || undefined;
          const dob = parts[3]?.trim() || undefined;
          return { dfn, name, ...(ssn && { ssn }), ...(dob && { dob }) };
        })
        .filter((r) => r !== null);
      audit('phi.patient-search', 'success', auditActor(request), {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { query: q.trim(), resultCount: results.length },
      });
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Ensure VistA RPC Broker is running and credentials are correct',
      };
    }
  });

  server.get('/vista/patient-demographics', async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn))) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=1' };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }
    const RPC_NAME = 'ORWPT SELECT';
    try {
      const lines = await safeCallRpc(RPC_NAME, [String(dfn)]);
      const raw = lines[0] || '';
      const parts = raw.split('^');
      if (parts[0] === '-1' || !parts[0]) {
        const reason = parts.slice(5).join(' ').trim() || 'Patient not found';
        return { ok: false, error: reason, hint: `DFN ${dfn} not found in VistA` };
      }
      const name = parts[0] || '';
      const sex = parts[1] || '';
      const dobFM = parts[2] || '';
      let dob = dobFM;
      if (/^\d{7}$/.test(dobFM)) {
        const y = parseInt(dobFM.substring(0, 3), 10) + 1700;
        const m = dobFM.substring(3, 5);
        const d = dobFM.substring(5, 7);
        dob = `${y}-${m}-${d}`;
      }
      // SSN from piece 4 (last 4 only for display safety)
      const rawSsn = parts[3]?.trim() || '';
      const ssn = rawSsn.length >= 4 ? rawSsn.slice(-4) : undefined;
      audit('phi.demographics-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
      return {
        ok: true,
        patient: { dfn: String(dfn), name, dob, sex, ...(ssn && { ssn }) },
        rpcUsed: RPC_NAME,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Ensure VistA RPC Broker is running and credentials are correct',
      };
    }
  });

  server.get('/vista/allergies', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn))) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=1' };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }
    const RPC_NAME = 'ORQQAL LIST';
    try {
      await requireSession(request, reply);
      if (reply.sent) return;

      const loadAllergies = async () => {
        const lines = await safeCallRpc(RPC_NAME, [String(dfn)]);
        const contaminated = hasInlineBrokerExecutionError(lines) || lines.some(isInlineRpcMissingLine);
        return { lines, contaminated };
      };

      let allergyLoad = await loadAllergies();
      if (allergyLoad.contaminated) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        allergyLoad = await loadAllergies();
      }

      if (allergyLoad.contaminated) {
        return {
          ok: true,
          count: 0,
          results: [],
          rpcUsed: RPC_NAME,
          status: 'integration-pending',
          pendingTargets: [RPC_NAME],
          pendingNote:
            'Live VistA allergy data returned broker/runtime error text during this request, so the response was withheld instead of showing a fake allergy row.',
        };
      }

      const results = parseAllergyRows(allergyLoad.lines);
      audit('phi.allergies-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: results.length },
      });
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: RPC_NAME,
        status: 'request-failed',
        pendingTargets: [RPC_NAME],
        pendingNote: 'Live VistA allergies could not be retrieved for this patient during this request.',
        results: [],
        hint: 'Ensure VistA RPC Broker is running and credentials are correct',
      };
    }
  });

  server.post('/vista/allergies', async (request) => {
    const body = request.body as any;
    const dfn = body?.dfn;
    const allergyText = body?.allergyText;
    if (!dfn || !/^\d+$/.test(String(dfn))) {
      return {
        ok: false,
        error: 'Missing or non-numeric dfn',
        hint: 'Body: { "dfn": "1", "allergyText": "PENICILLIN" }',
      };
    }
    if (!allergyText || typeof allergyText !== 'string' || allergyText.trim().length < 2) {
      return {
        ok: false,
        error: 'allergyText must be at least 2 characters',
        hint: 'Body: { "dfn": "1", "allergyText": "PENICILLIN" }',
      };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }
    try {
      await connect();
      const matchLines = await callRpc('ORWDAL32 ALLERGY MATCH', [
        allergyText.trim().toUpperCase(),
      ]);
      let matchEntry: { ien: string; name: string; source: string; allergyType: string } | null =
        null;
      for (const line of matchLines) {
        const parts = line.split('^');
        const ien = parts[0]?.trim();
        const name = parts[1]?.trim();
        const source = parts[2]?.trim() || '';
        const allergyType = parts[3]?.trim() || '';
        if (!source || !ien) continue;
        if (source.includes('GMRD(120.82')) {
          matchEntry = { ien, name, source, allergyType };
          break;
        }
        if (!matchEntry) matchEntry = { ien, name, source, allergyType };
      }
      if (!matchEntry) {
        disconnect();
        return {
          ok: false,
          error: `No matching allergen found for "${allergyText.trim()}"`,
          hint: 'Try a different allergen name',
        };
      }
      const duz = getDuz();
      const sourceGlobal = matchEntry.source.replace(/"B"\)$|"D"\)$|"T"\)$|"P"\)$|"C"\)$/, '');
      const gmragnt = matchEntry.name + '^' + matchEntry.ien + ';' + sourceGlobal;
      const allergyType = matchEntry.allergyType || 'D';
      const now = new Date();
      const fmYear = now.getFullYear() - 1700;
      const fmDate = `${fmYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const oredited: Record<string, string> = {
        GMRAGNT: gmragnt,
        GMRATYPE: allergyType,
        GMRANATR: 'U^Unknown',
        GMRAORIG: duz,
        GMRAORDT: fmDate,
        GMRAOBHX: 'h^HISTORICAL',
      };
      const saveLines = await callRpcWithList('ORWDAL32 SAVE ALLERGY', [
        { type: 'literal', value: '0' },
        { type: 'literal', value: String(dfn) },
        { type: 'list', value: oredited },
      ]);
      disconnect();
      const result = saveLines.join('\n').trim();
      if (result.startsWith('-1')) {
        const errMsg = result.split('^').slice(1).join('^') || 'Save failed';
        return { ok: false, error: errMsg, hint: 'The allergy could not be saved' };
      }
      audit('clinical.allergy-add', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { allergen: matchEntry.name },
      });
      return {
        ok: true,
        message: 'Allergy created',
        allergen: matchEntry.name,
        result,
        rpcUsed: 'ORWDAL32 SAVE ALLERGY',
      };
    } catch (err: any) {
      disconnect();
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct',
      };
    }
  });

  server.get('/vista/vitals', async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=1' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORQQVI VITALS';
    try {
      const lines = await safeCallRpc(RPC_NAME, [String(dfn), '3000101', '3991231']);
      const results = lines
        .map((line) => {
          const parts = line.split('^');
          const id = parts[0]?.trim();
          const type = parts[1]?.trim() || '';
          const value = parts[2]?.trim() || '';
          const takenAtFM = parts[3]?.trim() || '';
          if (!id) return null;
          let takenAt = takenAtFM;
          if (takenAtFM && takenAtFM.length >= 7) {
            const datePart = takenAtFM.split('.')[0] || '';
            const timePart = takenAtFM.split('.')[1] || '';
            if (/^\d{7}$/.test(datePart)) {
              const y = parseInt(datePart.substring(0, 3), 10) + 1700;
              const m = datePart.substring(3, 5);
              const d = datePart.substring(5, 7);
              let timeStr = '';
              if (timePart && timePart.length >= 4)
                timeStr = ' ' + timePart.substring(0, 2) + ':' + timePart.substring(2, 4);
              takenAt = `${y}-${m}-${d}${timeStr}`;
            }
          }
          return { type, value, takenAt };
        })
        .filter((r) => r !== null);
      audit('phi.vitals-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: results.length },
      });
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: RPC_NAME,
        status: 'request-failed',
        pendingTargets: [RPC_NAME],
        pendingNote: 'Live VistA vitals could not be retrieved for this patient during this request.',
        results: [],
      };
    }
  });

  server.post('/vista/vitals', async (request) => {
    const body = request.body as any;
    const dfn = body?.dfn;
    const type = (body?.type || '').toUpperCase().trim();
    const value = (body?.value || '').trim();
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    if (!type || !VITAL_TYPE_IEN[type])
      return {
        ok: false,
        error: `Invalid vital type. Must be one of: ${VALID_VITAL_TYPES.join(', ')}`,
      };
    if (!value || value.length < 1) return { ok: false, error: 'Missing value' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      await connect();
      const duz = getDuz();
      const now = new Date();
      const fmYear = now.getFullYear() - 1700;
      const fmDate = `${fmYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const vitalTypeIen = VITAL_TYPE_IEN[type];
      const hospitalLocation = 2;
      const gmvData = `${fmDate}^${dfn}^${vitalTypeIen};${value};^${hospitalLocation}^${duz}`;
      const lines = await callRpc('GMV ADD VM', [gmvData]);
      disconnect();
      const allText = lines.join('\n');
      if (allText.includes('ERROR'))
        return { ok: false, error: allText.trim() || 'VistA returned an error' };
      audit('clinical.vitals-add', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { type, value },
      });
      return { ok: true, message: 'Vital recorded', type, value, rpcUsed: 'GMV ADD VM' };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: safeErr(err) };
    }
  });

  server.get('/vista/notes', async (request) => {
    const { dfn } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn query parameter' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'TIU DOCUMENTS BY CONTEXT';
    try {
      const signedLines = await safeCallRpc(RPC_NAME, ['3', '1', String(dfn), '', '', '0', '0', 'D']);
      const unsignedLines = await safeCallRpc(RPC_NAME, ['3', '2', String(dfn), '', '', '0', '0', 'D']);
      const seenIens = new Set<string>();
      const allLines: string[] = [];
      for (const line of [...unsignedLines, ...signedLines]) {
        const ien = line.split('^')[0]?.trim();
        if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
          seenIens.add(ien);
          allLines.push(line);
        }
      }
      const errorLine = [...signedLines, ...unsignedLines].find((l) => l.startsWith('-1'));
      if (errorLine && allLines.length === 0) {
        const errMsg = errorLine.split('^').slice(1).join('^') || 'Unknown VistA error';
        return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
      }
      const results = allLines
        .map((line) => {
          const parts = line.split('^');
          if (parts.length < 7) return null;
          const id = parts[0].trim();
          if (!id || !/^\d+$/.test(id)) return null;
          const title = (parts[1] || '').replace(/^\+\s*/, '').trim();
          const fmDate = parts[2] || '';
          const authorField = parts[4] || '';
          const location = parts[5] || '';
          const status = parts[6] || '';
          let date = fmDate;
          if (fmDate && fmDate.length >= 7) {
            const [datePart, timePart] = fmDate.split('.');
            const y = parseInt(datePart.substring(0, 3), 10) + 1700;
            const m = datePart.substring(3, 5);
            const d = datePart.substring(5, 7);
            date = `${y}-${m}-${d}`;
            if (timePart && timePart.length >= 4)
              date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          }
          const authorParts = authorField.split(';');
          const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;
          return { id, title, date, author, location, status };
        })
        .filter(Boolean);
      audit('phi.notes-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: results.length },
      });
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: RPC_NAME,
        status: 'request-failed',
        pendingTargets: [RPC_NAME],
        pendingNote: 'Live VistA notes could not be retrieved for this patient during this request.',
        results: [],
      };
    }
  });

  server.post('/vista/notes', async (request) => {
    const body = request.body as any;
    const dfn = body?.dfn;
    const title = (body?.title || '').trim();
    const text = (body?.text || '').trim();
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    if (!title || title.length < 1) return { ok: false, error: 'Missing title' };
    if (!text || text.length < 1) return { ok: false, error: 'Missing text' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      await connect();
      const duz = getDuz();
      const now = new Date();
      const fmYear = now.getFullYear() - 1700;
      const fmDate = `${fmYear}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const TITLE_IEN = '10';
      const VLOC = '2';
      const tiux: Record<string, string> = { '1202': String(duz), '1301': fmDate };
      const createLines = await callRpcWithList('TIU CREATE RECORD', [
        { type: 'literal', value: String(dfn) },
        { type: 'literal', value: TITLE_IEN },
        { type: 'literal', value: fmDate },
        { type: 'literal', value: VLOC },
        { type: 'literal', value: '' },
        { type: 'list', value: tiux },
        { type: 'literal', value: '' },
        { type: 'literal', value: '1' },
        { type: 'literal', value: '0' },
      ]);
      const createResult = createLines[0] || '';
      if (createResult.startsWith('0^') || createResult.startsWith('-1')) {
        const errMsg = createResult.split('^').slice(1).join('^') || 'Failed to create note record';
        disconnect();
        return { ok: false, error: errMsg };
      }
      const noteId = createResult.split('^')[0].trim();
      if (!noteId || !/^\d+$/.test(noteId)) {
        disconnect();
        return { ok: false, error: `Unexpected response: ${createResult}` };
      }
      const bodyLines = text.split(/\r?\n/);
      const allTextLines = [title, '', ...bodyLines];
      const textData: Record<string, string> = { HDR: '1^1' };
      allTextLines.forEach((line, i) => {
        textData[`TEXT,${i + 1},0`] = line;
      });
      const textResult = await callRpcWithList('TIU SET DOCUMENT TEXT', [
        { type: 'literal', value: noteId },
        { type: 'list', value: textData },
        { type: 'literal', value: '0' },
      ]);
      disconnect();
      const textResp = textResult[0] || '';
      if (textResp.startsWith('0^'))
        return {
          ok: false,
          error: `Note ${noteId} created but text save failed: ${textResp}`,
          id: noteId,
        };
      audit('clinical.note-create', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { noteId, titleIen: TITLE_IEN },
      });
      return {
        ok: true,
        id: noteId,
        message: 'Note created',
        rpcUsed: 'TIU CREATE RECORD + TIU SET DOCUMENT TEXT',
      };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: safeErr(err) };
    }
  });

  server.get('/vista/medications', async (request) => {
    const { dfn } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn query parameter' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      const activeLines = await safeCallRpc('ORWPS ACTIVE', [String(dfn)]);
      if (activeLines.length > 0 && activeLines[0].startsWith('-1')) {
        const errMsg = activeLines[0].split('^').slice(1).join('^') || 'Unknown VistA error';
        return { ok: false, error: errMsg, rpcUsed: ['ORWPS ACTIVE'] };
      }
      interface MedEntry {
        orderIEN: string;
        rxId: string;
        type: string;
        drugName: string;
        status: string;
        qty: string;
        sig: string;
      }
      const meds: MedEntry[] = [];
      let current: MedEntry | null = null;
      for (const line of activeLines) {
        if (line.startsWith('~')) {
          const typeEnd = line.indexOf('^');
          const type = line.substring(1, typeEnd);
          const fields = line.substring(typeEnd + 1).split('^');
          current = {
            orderIEN: fields[7]?.trim() || '',
            rxId: fields[0]?.split(';')[0] || '',
            type,
            drugName: fields[1]?.trim() || '',
            status: fields[8]?.trim() || '',
            qty: fields[11]?.trim() || '',
            sig: '',
          };
          meds.push(current);
        } else if (current) {
          const trimmed = line.trim();
          if (trimmed.startsWith('\\ Sig:') || trimmed.startsWith('\\Sig:'))
            current.sig = trimmed.replace(/^\\\s*Sig:\s*/i, '').trim();
          else if (trimmed.startsWith('Qty:')) current.qty = trimmed.replace(/^Qty:\s*/, '').trim();
        }
      }

      const rpcUsedSet = new Set<string>(['ORWPS ACTIVE']);
      for (const med of meds) {
        if (!med.drugName && med.orderIEN && /^\d+$/.test(med.orderIEN)) {
          try {
            const txtLines = await safeCallRpc('ORWORR GETTXT', [med.orderIEN]);
            if (txtLines.length > 0 && !txtLines[0].startsWith('-1')) {
              med.drugName = txtLines[0].trim();
              if (!med.sig && txtLines[1]) med.sig = txtLines[1].trim();
              rpcUsedSet.add('ORWORR GETTXT');
            }
          } catch {
            /* non-fatal */
          }
        }
      }

      let results = meds.map((m) => ({
        id: m.rxId || m.orderIEN,
        name: m.drugName || '(unknown medication)',
        sig: m.sig,
        status: m.status.toLowerCase() || 'active',
      }));

      let fallbackUsed = false;
      let fallbackReason: string | undefined;

      if (results.length === 0) {
        for (let attempt = 0; attempt < 2 && results.length === 0; attempt += 1) {
          if (attempt > 0) {
            await delay(150);
          }
          const fallback = await buildMedicationFallbackFromOrders(String(dfn));
          for (const rpc of fallback.rpcUsed) rpcUsedSet.add(rpc);
          if (fallback.results.length > 0) {
            results = fallback.results;
            fallbackUsed = true;
            fallbackReason =
              'ORWPS ACTIVE returned no active medication rows; medication list synthesized from live active CPRS medication orders.';
          }
        }
      }

      audit('phi.medications-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: results.length },
      });
      return {
        ok: true,
        count: results.length,
        results,
        rpcUsed: Array.from(rpcUsedSet),
        fallbackUsed,
        fallbackReason,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
  });

  server.post('/vista/medications', async (request) => {
    const body = request.body as any;
    const dfn = body?.dfn;
    const drug = body?.drug;
    const tenantId =
      typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
        ? request.session.tenantId.trim()
        : 'default';
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    if (!drug || typeof drug !== 'string' || drug.trim().length < 2)
      return { ok: false, error: 'drug must be at least 2 characters' };
    const qo = matchQuickOrder(drug);
    if (!qo) {
      const available = QUICK_ORDERS.map((q) => q.name).join(', ');
      return {
        ok: false,
        error: `No matching quick order for "${drug.trim()}"`,
        availableDrugs: available,
      };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      await connect();
      const duz = getDuz();
      const lockLines = await callRpc('ORWDX LOCK', [String(dfn)]);
      if ((lockLines[0]?.trim() || '') !== '1') {
        disconnect();
        return { ok: false, error: 'Could not lock patient for ordering' };
      }
      const LOCATION_IEN = '2';
      let autoackLines: string[];
      try {
        autoackLines = await callRpc('ORWDXM AUTOACK', [
          String(dfn),
          duz,
          LOCATION_IEN,
          String(qo.ien),
        ]);
      } catch (autoackErr: any) {
        try {
          await callRpc('ORWDX UNLOCK', [String(dfn)]);
        } catch {}
        disconnect();
        const draft = createDraft(
          'order-sign',
          String(dfn),
          'ORWDXM AUTOACK',
          {
            action: 'meds-quick-order',
            drug: drug.trim(),
            quickOrderIen: qo.ien,
            attemptedAt: new Date().toISOString(),
            failure: safeErr(autoackErr),
          },
          tenantId
        );
        audit('clinical.medication-add', 'success', auditActor(request), {
          patientDfn: String(dfn),
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { quickOrder: qo.name, draftId: draft.id, mode: 'draft' },
        });
        return {
          ok: true,
          mode: 'draft',
          draftId: draft.id,
          status: 'sync-pending',
          syncPending: true,
          quickOrder: qo.name,
          message: 'Medication order saved as server-side draft. ORWDXM AUTOACK sync pending.',
          rpcUsed: 'ORWDXM AUTOACK',
        };
      }
      try {
        await callRpc('ORWDX UNLOCK', [String(dfn)]);
      } catch {}
      disconnect();
      const raw = autoackLines.join('\n').trim();
      if (!raw || raw === '0' || raw.startsWith('-1'))
        {
          const draft = createDraft(
            'order-sign',
            String(dfn),
            'ORWDXM AUTOACK',
            {
              action: 'meds-quick-order',
              drug: drug.trim(),
              quickOrderIen: qo.ien,
              attemptedAt: new Date().toISOString(),
              autoackRaw: raw || '(empty)',
            },
            tenantId
          );
          audit('clinical.medication-add', 'success', auditActor(request), {
            patientDfn: String(dfn),
            requestId: (request as any).requestId,
            sourceIp: request.ip,
            detail: {
              quickOrder: qo.name,
              draftId: draft.id,
              mode: 'draft',
              autoackRaw: raw || '(empty)',
            },
          });
          return {
            ok: true,
            mode: 'draft',
            draftId: draft.id,
            status: 'sync-pending',
            syncPending: true,
            quickOrder: qo.name,
            message: 'Medication order saved as server-side draft. ORWDXM AUTOACK did not return a live order.',
            rpcUsed: 'ORWDXM AUTOACK',
          };
        }
      const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, '');
      audit('clinical.medication-add', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { quickOrder: qo.name, orderIEN },
      });
      return {
        ok: true,
        message: `Medication order created (unsigned): ${qo.name}`,
        orderIEN,
        quickOrder: qo.name,
        raw: autoackLines,
        rpcUsed: 'ORWDXM AUTOACK',
      };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: safeErr(err) };
    }
  });

  server.get('/vista/default-patient-list', async (request) => {
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      const lines = await safeCallRpc('ORQPT DEFAULT PATIENT LIST', []);
      const results = lines
        .map((line) => {
          const parts = line.split('^').map((s) => s.trim());
          const dfn = parts[0];
          const name = parts[1];
          if (!dfn || !name) return null;
          const ssn = parts[2] || undefined;
          const dob = parts[3] || undefined;
          return { dfn, name, ...(ssn && { ssn }), ...(dob && { dob }) };
        })
        .filter((r) => r !== null);
      audit('phi.patient-list', 'success', auditActor(request), {
        detail: { count: results.length },
      });
      return { ok: true, count: results.length, results };
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
  });

  server.get('/vista/problems', async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn query parameter' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORQQPL PROBLEM LIST';
    try {
      const lines = await safeCallRpc(RPC_NAME, [String(dfn), 'A']);
      if (lines.length > 0 && lines[0].startsWith('-1')) {
        const errMsg = lines[0].split('^').slice(1).join('^') || 'Unknown VistA error';
        return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
      }
      // ORQQPL PROBLEM LIST format: IEN^Status(A/I)^ProblemText^ICDCode^OnsetDateFM^LastModFM^...
      const results = lines
        .map((line) => {
          if (!line || line.trim() === '') return null;
          const parts = line.split('^');
          // Skip count line (single numeric) or lines too short
          if (parts.length < 3) return null;
          const ien = parts[0]?.trim();
          const statusFlag = parts[1]?.trim();   // 'A' = active, 'I' = inactive
          const text = parts[2]?.trim();          // Problem narrative
          const icdCode = parts[3]?.trim() || '';
          const onsetFm = parts[4]?.trim() || '';
          if (!ien || !text || !/^\d+$/.test(ien)) return null;
          const onset = formatProblemOnsetFromFileMan(onsetFm);
          let displayStatus = 'active';
          if (statusFlag === 'I') displayStatus = 'inactive';
          else if (statusFlag === 'R') displayStatus = 'resolved';
          return { id: ien, text, status: displayStatus, icdCode: icdCode || undefined, onset };
        })
        .filter((r) => r !== null);
      audit('phi.problems-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: results.length },
      });
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
  });

  server.post('/vista/problems', async (_request) => {
    const body = (_request.body as any) || {};
    const dfn = body?.dfn;
    const text = body?.text;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    if (!text || typeof text !== 'string' || text.trim().length < 2)
      return { ok: false, error: 'text must be at least 2 characters' };
    return {
      ok: false,
      error:
        'Problem creation is not yet implemented in this MVP. VistA problem entry requires ICD-9/ICD-10 diagnosis codes, provider validation, and service condition flags.',
      blocker: {
        reason: 'Complex CPOE validation',
        recommendation: 'Use VistA CPRS GUI which handles validation safely',
      },
    };
  });

  server.get('/vista/icd-search', async (request) => {
    const { q } = request.query as any;
    if (!q || typeof q !== 'string' || q.trim().length < 2)
      return { ok: false, error: 'Search query must be at least 2 characters' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORQQPL4 LEX';
    try {
      await connect();
      const lines = await callRpc(RPC_NAME, [q.trim()]);
      disconnect();
      const results = (Array.isArray(lines) ? lines : [lines])
        .filter((l: string) => l && l.trim())
        .map((line: string, idx: number) => {
          const parts = line.split('^');
          if (parts.length >= 3) return { id: parts[0], description: parts[1], icd: parts[2] };
          else if (parts.length === 2)
            return { id: String(idx), description: parts[0], icd: parts[1] };
          return { id: String(idx), icd: '', description: line };
        });
      return { ok: true, rpc: RPC_NAME, count: results.length, results };
    } catch (err: any) {
      disconnect();
      return { ok: false, rpc: RPC_NAME, error: safeErr(err) };
    }
  });

  server.get('/vista/consults', async (request, reply) => {
    const { dfn } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    await requireSession(request, reply);
    const RPC_NAME = 'ORQQCN LIST';
    const normalizeConsultStatus = (
      rawStatus: string
    ): { label: string; code: string; category: 'pending' | 'complete' | 'unknown' } => {
      const code = rawStatus.trim().toLowerCase();
      switch (code) {
        case 'a':
          return { label: 'Active', code, category: 'pending' };
        case 'p':
        case 'pr':
          return { label: 'Pending', code, category: 'pending' };
        case 's':
          return { label: 'Scheduled', code, category: 'pending' };
        case 'ip':
          return { label: 'In Progress', code, category: 'pending' };
        case 'c':
          return { label: 'Complete', code, category: 'complete' };
        case 'dc':
          return { label: 'Discontinued', code, category: 'complete' };
        case 'x':
        case 'ca':
          return { label: 'Cancelled', code, category: 'complete' };
        case 'h':
          return { label: 'On Hold', code, category: 'pending' };
        default:
          return {
            label: rawStatus.trim() || 'Unknown',
            code,
            category: code ? 'unknown' : 'unknown',
          };
      }
    };
    try {
      const lines = await safeCallRpc(RPC_NAME, [String(dfn), '', '', '', '']);
      if (lines.length === 0 || (lines.length === 1 && lines[0].startsWith('<')))
        return { ok: true, count: 0, results: [], rpcUsed: [RPC_NAME], status: 'ok-empty' };
      const results = lines
        .map((line) => {
          const p = line.split('^');
          if (p.length < 5) return null;
          const id = p[0]?.trim();
          if (!id || !/^\d+$/.test(id)) return null;
          let date = p[1] || '';
          if (date && date.length >= 7) {
            const [dp, tp] = date.split('.');
            const y = parseInt(dp.substring(0, 3), 10) + 1700;
            const m = dp.substring(3, 5);
            const d = dp.substring(5, 7);
            date = `${y}-${m}-${d}`;
            if (tp && tp.length >= 4) date += ` ${tp.substring(0, 2)}:${tp.substring(2, 4)}`;
          }
          const statusInfo = normalizeConsultStatus((p[2] || '').trim());
          const service = (p[3] || '').trim();
          const typeStr = (p[4] || '').trim();
          const typeCode = (p[8] || '').trim();
          return {
            id,
            date,
            status: statusInfo.label,
            statusCode: statusInfo.code,
            statusCategory: statusInfo.category,
            service,
            type: typeStr || 'Consult',
            typeCode,
          };
        })
        .filter(Boolean);
      return { ok: true, count: results.length, results, rpcUsed: [RPC_NAME], status: 'ok' };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: [RPC_NAME],
        status: 'request-failed',
        pendingTargets: ['ORQQCN GET CONSULTS'],
        pendingNote: 'Live consult read failed at runtime after session authentication.',
        results: [],
      };
    }
  });

  server.get('/vista/consults/detail', async (request, reply) => {
    const { id } = request.query as any;
    if (!id || !/^\d+$/.test(String(id)))
      return { ok: false, error: 'Missing or non-numeric consult id' };
    await requireSession(request, reply);
    try {
      const lines = await safeCallRpc('ORQQCN DETAIL', [String(id)]);
      return { ok: true, text: lines.join('\n'), rpcUsed: ['ORQQCN DETAIL'] };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: ['ORQQCN DETAIL'],
        status: 'request-failed',
      };
    }
  });

  server.get('/vista/surgery', async (request) => {
    const { dfn } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORWSR LIST';
    try {
      const lines = await safeCallRpc(RPC_NAME, [String(dfn), '', '', '-1', '999']);
      if (lines.length === 0 || (lines.length === 1 && !lines[0].trim()))
        return { ok: true, count: 0, results: [], rpcUsed: RPC_NAME };
      const results = lines
        .map((line) => {
          const p = line.split('^');
          if (p.length < 3) return null;
          const id = p[0]?.trim();
          if (!id) return null;
          const procedure = (p[1] || '').trim();
          const date = formatVistaDateTime(p[2] || '');
          const surgeonField = (p[3] || '').trim();
          const surgeon = surgeonField.includes(';')
            ? surgeonField.split(';')[1] || surgeonField
            : surgeonField;
          return { id, caseNum: id, procedure, date, surgeon, status: 'Complete' };
        })
        .filter(Boolean);
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: [RPC_NAME],
        status: 'request-failed',
        pendingTargets: ['ORWSR LIST'],
        pendingNote: 'Live surgery list failed at runtime after VistA authentication.',
        results: [],
      };
    }
  });

  server.get('/vista/surgery/detail', async (request) => {
    const { id, dfn } = request.query as any;
    if (!id || !/^\d+$/.test(String(id))) {
      return { ok: false, error: 'Missing or non-numeric surgery id' };
    }
    if (dfn && !/^\d+$/.test(String(dfn))) {
      return { ok: false, error: 'dfn must be numeric when provided' };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }

    const selectedId = String(id);
    const selectedDfn = dfn ? String(dfn) : undefined;
    const rpcUsed = new Set<string>();

    try {
      let caseLines = await safeCallRpc('ORWSR ONECASE', [selectedId]);
      rpcUsed.add('ORWSR ONECASE');
      let resolvedFromId = selectedId;
      let caseHadExecutionError = hasVistaExecutionError(caseLines);

      if (caseHadExecutionError && selectedDfn) {
        try {
          await reconnectSurgeryBroker();
          const listLines = await safeCallRpc('ORWSR LIST', [selectedDfn, '', '', '-1', '999']);
          rpcUsed.add('ORWSR LIST');
          const siblingIds = listLines
            .map((line) => (line.split('^')[0] || '').trim())
            .filter((candidateId) => /^\d+$/.test(candidateId) && candidateId !== selectedId);

          for (const siblingId of siblingIds) {
            try {
              await reconnectSurgeryBroker();
              const siblingCaseLines = await safeCallRpc('ORWSR ONECASE', [siblingId]);
              rpcUsed.add('ORWSR ONECASE');
              if (hasVistaExecutionError(siblingCaseLines)) continue;
              const siblingDocuments = parseSurgeryLinkedDocuments(siblingCaseLines, siblingId).documents;
              const matchesSelectedCase =
                siblingDocuments.some((doc) => doc.id === selectedId) ||
                responseMentionsSurgeryCase(siblingCaseLines, selectedId);
              if (!matchesSelectedCase) continue;
              caseLines = siblingCaseLines;
              resolvedFromId = siblingId;
              caseHadExecutionError = false;
              break;
            } catch {
              // Keep probing sibling surgery entries until one resolves the selected case.
            }
          }
        } catch {
          // Leave the original ORWSR ONECASE payload in place if the list fallback fails.
        }
      }

      const { documents, candidateIds } = parseSurgeryLinkedDocuments(caseLines, selectedId);
      const orderedCandidateIds =
        resolvedFromId !== selectedId
          ? [
              resolvedFromId,
              ...candidateIds.filter(
                (candidateId) => candidateId !== resolvedFromId && candidateId !== selectedId
              ),
            ]
          : candidateIds;
      let noteId: string | undefined;
      let textLines: string[] = [];
      let detailLines: string[] = [];

      for (const candidateId of orderedCandidateIds) {
        if (caseHadExecutionError && candidateId === selectedId) continue;
        try {
          const nextTextLines = await safeCallRpc('TIU GET RECORD TEXT', [candidateId]);
          if (nonEmptyLines(nextTextLines).length === 0) continue;
          noteId = candidateId;
          textLines = nextTextLines;
          rpcUsed.add('TIU GET RECORD TEXT');
          try {
            const nextDetailLines = await safeCallRpc('TIU DETAILED DISPLAY', [candidateId]);
            if (nonEmptyLines(nextDetailLines).length > 0) {
              detailLines = nextDetailLines;
              rpcUsed.add('TIU DETAILED DISPLAY');
            }
          } catch {
            // Leave detail empty if TIU detail is unavailable for the resolved note.
          }
          break;
        } catch {
          // Keep probing candidate note ids until one resolves real TIU text.
        }
      }

      if (caseHadExecutionError) {
        return {
          ok: false,
          id: selectedId,
          resolvedFromId,
          linkedDocuments: documents,
          noteId,
          rawCase: caseLines,
          text: textLines.join('\n'),
          detail: detailLines.join('\n'),
          rpcUsed: Array.from(rpcUsed),
          error:
            'Surgery detail unavailable. ORWSR ONECASE returned a VistA runtime error for this case.',
        };
      }

      return {
        ok: true,
        id: selectedId,
        resolvedFromId,
        linkedDocuments: documents,
        noteId,
        rawCase: caseLines,
        text: textLines.join('\n'),
        detail: detailLines.join('\n'),
        rpcUsed: Array.from(rpcUsed),
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed: Array.from(rpcUsed) };
    }
  });

  server.get('/vista/dc-summaries', async (request) => {
    const { dfn } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'TIU DOCUMENTS BY CONTEXT';
    try {
      const signedLines = await safeCallRpc(RPC_NAME, ['244', '1', String(dfn), '', '', '0', '0', 'D']);
      const unsignedLines = await safeCallRpc(RPC_NAME, [
        '244',
        '2',
        String(dfn),
        '',
        '',
        '0',
        '0',
        'D',
      ]);
      const seenIens = new Set<string>();
      const allLines: string[] = [];
      for (const line of [...unsignedLines, ...signedLines]) {
        const ien = line.split('^')[0]?.trim();
        if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
          seenIens.add(ien);
          allLines.push(line);
        }
      }
      const results = allLines
        .map((line) => {
          const parts = line.split('^');
          if (parts.length < 7) return null;
          const id = parts[0].trim();
          if (!id || !/^\d+$/.test(id)) return null;
          const title = (parts[1] || '').replace(/^\+\s*/, '').trim();
          const fmDate = parts[2] || '';
          let date = fmDate;
          if (fmDate && fmDate.length >= 7) {
            const [datePart, timePart] = fmDate.split('.');
            const y = parseInt(datePart.substring(0, 3), 10) + 1700;
            const m = datePart.substring(3, 5);
            const d = datePart.substring(5, 7);
            date = `${y}-${m}-${d}`;
            if (timePart && timePart.length >= 4)
              date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          }
          const authorField = parts[4] || '';
          const authorParts = authorField.split(';');
          const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;
          const location = parts[5] || '';
          const status = parts[6] || '';
          return { id, title, date, author, location, status };
        })
        .filter(Boolean);
      return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: [RPC_NAME],
        status: 'request-failed',
        pendingTargets: ['TIU DOCUMENTS BY CONTEXT'],
        pendingNote: 'Live discharge summary fetch failed at runtime after VistA authentication.',
        results: [],
      };
    }
  });

  server.get('/vista/tiu-text', async (request) => {
    const { id } = request.query as any;
    if (!id || !/^\d+$/.test(String(id)))
      return { ok: false, error: 'Missing or non-numeric document id' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    try {
      const lines = await safeCallRpc('TIU GET RECORD TEXT', [String(id)]);
      return { ok: true, text: lines.join('\n'), rpcUsed: 'TIU GET RECORD TEXT' };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed: 'TIU GET RECORD TEXT' };
    }
  });

  server.get('/vista/labs', async (request) => {
    const { dfn } = request.query as any;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORWLRR INTERIM';
    try {
      const lines = await safeCallRpc(RPC_NAME, [String(dfn), '', '']);
      const results: {
        ackId?: string;
        resultId?: string;
        testName: string;
        result: string;
        units: string;
        refRange: string;
        flag: string;
        specimen: string;
        collectionDate: string;
      }[] = [];
      let currentSpecimen = '';
      let currentDate = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^Specimen:/i.test(trimmed)) {
          currentSpecimen = trimmed.replace(/^Specimen:\s*/i, '').trim();
          continue;
        }
        if (/^(Collection\s+Date|Collected):/i.test(trimmed)) {
          currentDate = trimmed.replace(/^(Collection\s+Date|Collected):\s*/i, '').trim();
          continue;
        }
        if (trimmed.includes('^')) {
          const p = trimmed.split('^');
          const leadingField = (p[0] || '').trim();
          const hasLeadingResultId = /^\d+(?:[.;:-]\d+)*$/.test(leadingField) && Boolean((p[1] || '').trim());
          const valueOffset = hasLeadingResultId ? 1 : 0;
          if (p.length >= 2)
            results.push({
              ackId: hasLeadingResultId ? leadingField : undefined,
              resultId: hasLeadingResultId ? leadingField : undefined,
              testName: (p[valueOffset] || '').trim(),
              result: (p[valueOffset + 1] || '').trim(),
              units: (p[valueOffset + 2] || '').trim(),
              refRange: (p[valueOffset + 3] || '').trim(),
              flag: (p[valueOffset + 4] || '').trim(),
              specimen: currentSpecimen,
              collectionDate: currentDate,
            });
        }
      }
      const rawText = lines.join('\n');
      if (results.length === 0)
        return {
          ok: true,
          count: 0,
          results: [],
          rawText,
          rpcUsed: RPC_NAME,
          note: 'Lab results returned as free text; structured parsing found no caret-delimited entries',
        };
      return { ok: true, count: results.length, results, rawText, rpcUsed: RPC_NAME };
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed: RPC_NAME,
        status: 'request-failed',
        pendingTargets: [RPC_NAME],
        pendingNote: 'Live VistA lab results could not be retrieved for this patient during this request.',
        results: [],
      };
    }
  });

  function parseReportCatalogOption(raw: string) {
    const parts = String(raw || '').split('^');
    return {
      id: (parts[0] || '').trim(),
      label: (parts[1] || parts[0] || '').trim(),
      raw: String(raw || ''),
    };
  }

  function resolveReportCatalogSection(
    reportId: string,
    currentSectionId: string,
    currentSectionLabel: string,
    sectionLookup: Map<string, string>
  ) {
    const sectionOverrideId = reportId === 'OR_PN' ? 'OR_PNMN' : '';
    if (!sectionOverrideId) {
      return { sectionId: currentSectionId, sectionLabel: currentSectionLabel };
    }
    return {
      sectionId: sectionOverrideId,
      sectionLabel: sectionLookup.get(sectionOverrideId) || 'Progress Notes',
    };
  }

  function toFileManDateTime(value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';
    const fmYear = parsed.getUTCFullYear() - 1700;
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const hour = String(parsed.getUTCHours()).padStart(2, '0');
    const minute = String(parsed.getUTCMinutes()).padStart(2, '0');
    const second = String(parsed.getUTCSeconds()).padStart(2, '0');
    return `${fmYear}${month}${day}.${hour}${minute}${second}`;
  }

  function resolveReportTextQuery(query: any) {
    const rawQualifier = String(query?.qualifier || '').trim();
    const qualifierToken = rawQualifier ? rawQualifier.split('^')[0].trim() : '';
    let hsType = String(query?.hsType || '').trim();
    let daysBack = String(query?.daysBack || '').trim();
    let examId = String(query?.examId || '').trim();
    let alpha = String(query?.alpha || '').trim();
    let omega = String(query?.omega || '').trim();

    if (hsType.startsWith('h')) {
      hsType = hsType.slice(1).split('^')[0].split(';')[0].trim();
    }

    if (qualifierToken) {
      if (/^d/i.test(qualifierToken)) {
        const candidateDaysBack = qualifierToken.slice(1).split(';')[0].trim();
        if (/^\d+$/.test(candidateDaysBack)) {
          daysBack = candidateDaysBack;
        }
      } else if (/^h/i.test(qualifierToken)) {
        hsType = qualifierToken.slice(1).split(';')[0].trim();
      } else if (/^i/i.test(qualifierToken)) {
        examId = qualifierToken.slice(1).split(';')[0].trim();
      } else if (/^T/i.test(qualifierToken)) {
        const rangeSpec = qualifierToken.slice(1);
        const [startRaw, endRaw] = rangeSpec.split(';');
        alpha = alpha || toFileManDateTime(startRaw || '');
        omega = omega || toFileManDateTime(endRaw || '');
      }
    }

    alpha = toFileManDateTime(alpha);
    omega = toFileManDateTime(omega);

    return {
      qualifier: rawQualifier,
      hsType,
      daysBack,
      examId,
      alpha,
      omega,
    };
  }

  function parseTiuContextReportNote(line: string) {
    const parts = String(line || '').split('^');
    if (parts.length < 7) return null;
    const id = (parts[0] || '').trim();
    if (!/^\d+$/.test(id)) return null;
    const title = (parts[1] || '').replace(/^\+\s*/, '').trim() || 'Untitled note';
    const fmDate = (parts[2] || '').trim();
    const authorField = (parts[4] || '').trim();
    const location = (parts[5] || '').trim();
    const status = (parts[6] || '').trim();
    let date = fmDate;
    if (fmDate && fmDate.length >= 7) {
      const [datePart, timePart] = fmDate.split('.');
      const y = parseInt(datePart.substring(0, 3), 10) + 1700;
      const m = datePart.substring(3, 5);
      const d = datePart.substring(5, 7);
      date = `${y}-${m}-${d}`;
      if (timePart && timePart.length >= 4) {
        date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
      }
    }
    const authorParts = authorField.split(';');
    const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField || 'Unknown author';
    return { id, title, date, author, location, status };
  }

  async function buildProgressNotesReportFallback(dfn: string) {
    const rpcUsed = new Set<string>(['TIU DOCUMENTS BY CONTEXT']);
    const signedLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', ['3', '1', String(dfn), '', '', '0', '0', 'D']);
    const unsignedLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', ['3', '2', String(dfn), '', '', '0', '0', 'D']);
    const seenIens = new Set<string>();
    const mergedNotes = [...unsignedLines, ...signedLines]
      .map((line) => parseTiuContextReportNote(line))
      .filter((note): note is NonNullable<typeof note> => Boolean(note))
      .filter((note) => {
        if (seenIens.has(note.id)) return false;
        seenIens.add(note.id);
        return true;
      });

    const renderedBlocks: string[] = [];
    for (const note of mergedNotes) {
      if (renderedBlocks.length >= 5) break;
      try {
        const textLines = await safeCallRpc('TIU GET RECORD TEXT', [note.id]);
        rpcUsed.add('TIU GET RECORD TEXT');
        const text = textLines.join('\n').trim();
        if (!text) continue;
        const metadata = [note.date, note.author, note.location, note.status]
          .filter(Boolean)
          .join(' | ');
        renderedBlocks.push(`${note.title}${metadata ? `\n${metadata}` : ''}\n\n${text}`);
      } catch {
        continue;
      }
    }

    if (renderedBlocks.length === 0) return null;

    return {
      text:
        'Progress Notes report fallback synthesized from live TIU note documents because ORWRP REPORT TEXT returned blank content in this environment.\n\n' +
        renderedBlocks.join('\n\n------------------------------------------------------------\n\n'),
      rpcUsed: Array.from(rpcUsed),
      noteCount: mergedNotes.length,
      renderedCount: renderedBlocks.length,
    };
  }

  server.get('/vista/reports', async (_request) => {
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORWRP REPORT LISTS';
    try {
      const lines = await safeCallRpc(RPC_NAME, []);
      const rawReports: {
        id: string;
        heading: string;
        qualifier: string;
        remote: string;
        rpcName: string;
        category: string;
      }[] = [];
      const dateRanges: string[] = [];
      const hsTypes: string[] = [];
      let currentSection = '';
      for (const line of lines) {
        if (line.includes('[DATE RANGES]')) {
          currentSection = 'dateRanges';
          continue;
        }
        if (line.includes('[HEALTH SUMMARY TYPES]')) {
          currentSection = 'hsTypes';
          continue;
        }
        if (line.includes('[REPORT LIST]')) {
          currentSection = 'reportList';
          continue;
        }
        if (currentSection === 'dateRanges') {
          dateRanges.push(line);
          continue;
        }
        if (currentSection === 'hsTypes') {
          hsTypes.push(line);
          continue;
        }
        if (currentSection === 'reportList' && line.trim()) {
          const p = line.split('^');
          rawReports.push({
            id: (p[0] || '').trim(),
            heading: (p[1] || '').trim(),
            qualifier: (p[2] || '').trim(),
            remote: (p[6] || '').trim(),
            rpcName: (p[9] || '').trim(),
            category: (p[8] || '').trim(),
          });
        }
      }
      const sections: { id: string; label: string }[] = [];
      const sectionLookup = new Map<string, string>();
      let currentSectionId = 'clinical-reports';
      let currentSectionLabel = 'Clinical Reports';
      const reports = rawReports
        .filter((report) => report.id !== '$$END' && report.heading)
        .flatMap((report) => {
          if (!report.rpcName) {
            currentSectionId = report.id || currentSectionId;
            currentSectionLabel = report.heading || currentSectionLabel;
            sections.push({ id: currentSectionId, label: currentSectionLabel });
            sectionLookup.set(currentSectionId, currentSectionLabel);
            return [];
          }
          if (report.rpcName !== 'ORWRP REPORT TEXT') return [];
          const resolvedSection = resolveReportCatalogSection(
            report.id,
            currentSectionId,
            currentSectionLabel,
            sectionLookup
          );
          return {
            id: report.id,
            name: report.heading,
            hsType: '',
            qualifier: report.qualifier,
            qualifierType: Number.parseInt(report.qualifier || '0', 10) || 0,
            sectionId: resolvedSection.sectionId,
            sectionLabel: resolvedSection.sectionLabel,
            remote: report.remote === '1',
            rpcName: report.rpcName,
            localOnly: report.remote !== '1',
          };
        });

      const dateRangeOptions = dateRanges
        .map((raw) => parseReportCatalogOption(raw))
        .filter((option) => option.id && option.id !== '$$END');
      const hsTypeOptions = hsTypes
        .map((raw) => parseReportCatalogOption(raw))
        .filter((option) => option.id && option.id !== '$$END');

      return {
        ok: true,
        count: reports.length,
        reports,
        sections,
        dateRanges,
        dateRangeOptions,
        hsTypes,
        hsTypeOptions,
        rawReports,
        rpcUsed: RPC_NAME,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed: RPC_NAME };
    }
  });

  server.get('/vista/reports/text', async (request) => {
    const { dfn, id } = request.query as any;
    const LOCAL_ONLY_REPORT_IDS = new Set(['19', '28']);
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    if (!id) return { ok: false, error: 'Missing report id' };
    if (LOCAL_ONLY_REPORT_IDS.has(String(id))) {
      return {
        ok: false,
        status: 'local-only',
        localOnly: true,
        error: 'local-only',
        message:
          'This report is marked local only in the live VistA catalog and does not expose report text through ORWRP REPORT TEXT.',
        rpcUsed: 'ORWRP REPORT TEXT',
      };
    }
    try {
      validateCredentials();
    } catch (err: any) {
      return { ok: false, error: safeErr(err) };
    }
    const RPC_NAME = 'ORWRP REPORT TEXT';
    const resolved = resolveReportTextQuery(request.query as any);
    try {
      const lines = await safeCallRpc(RPC_NAME, [
        String(dfn),
        String(id),
        resolved.hsType,
        resolved.daysBack,
        resolved.examId,
        resolved.alpha,
        resolved.omega,
      ]);
      const text = lines.join('\n');
      if (String(id) === 'OR_PN' && !text.trim()) {
        const fallback = await buildProgressNotesReportFallback(String(dfn));
        if (fallback?.text?.trim()) {
          return {
            ok: true,
            text: fallback.text,
            resolved,
            rpcUsed: Array.from(new Set([RPC_NAME, ...fallback.rpcUsed])),
            fallbackUsed: true,
            fallbackReason:
              'ORWRP REPORT TEXT returned blank content for the Progress Notes report; response synthesized from live TIU note documents.',
            source: 'tiu-progress-notes',
            noteCount: fallback.noteCount,
            renderedCount: fallback.renderedCount,
          };
        }
      }
      return {
        ok: true,
        text,
        resolved,
        rpcUsed: RPC_NAME,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed: RPC_NAME };
    }
  });
}
