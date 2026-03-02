/**
 * Clearinghouse Adapter v2 — Provider-Agnostic Interface
 * Phase 519 (Wave 37 B7)
 *
 * Adds:
 *   1. Provider-agnostic ClearinghouseGateway interface (submit837, check276277, receive835)
 *   2. Record/Replay harness for deterministic integration testing
 *   3. Stedi-compatible adapter behind CLEARINGHOUSE_PROVIDER feature flag
 *   4. File-based trace store at data/rcm/traces/
 *
 * The adapter wraps the existing ClearinghouseConnector and adds:
 *   - Request/response trace recording with SHA-256 content hashing
 *   - Replay mode that serves recorded responses without network calls
 *   - Structured submission result with tracking + timing metadata
 */

import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from '../connectors/types.js';
import { getConnector } from '../connectors/types.js';

/* ── Types ──────────────────────────────────────────────────── */

export type ClearinghouseProvider = 'generic' | 'stedi' | 'availity' | 'change' | 'waystar';

export interface ClearinghouseSubmission {
  id: string;
  transactionSet: X12TransactionSet;
  provider: ClearinghouseProvider;
  payload: string;
  metadata: Record<string, string>;
  submittedAt: string;
  result?: ConnectorResult;
  durationMs?: number;
}

export interface ClearinghouseReceiveResult {
  transactionSet: X12TransactionSet;
  payload: string;
  receivedAt: string;
  contentHash: string;
}

export interface TraceEntry {
  id: string;
  timestamp: string;
  direction: 'outbound' | 'inbound';
  transactionSet: X12TransactionSet;
  provider: ClearinghouseProvider;
  requestHash: string;
  responseHash?: string;
  request: string;
  response?: string;
  metadata: Record<string, string>;
  durationMs?: number;
  result?: {
    success: boolean;
    transactionId?: string;
    errorCount: number;
  };
}

export interface ReplayMatch {
  traceId: string;
  matched: boolean;
  response?: string;
  result?: ConnectorResult;
}

/* ── Config ─────────────────────────────────────────────────── */

export interface ClearinghouseGatewayConfig {
  /** Which provider to use. Default: 'generic' (wraps existing ClearinghouseConnector). */
  provider: ClearinghouseProvider;
  /** Enable trace recording. Default: true in dev, false in prod. */
  recordTraces: boolean;
  /** Enable replay mode (serve from traces, no real calls). Default: false. */
  replayMode: boolean;
  /** Directory for trace storage. Default: data/rcm/traces */
  traceDir: string;
  /** Max traces to retain per transaction set. Default: 100. */
  maxTracesPerSet: number;
  /** Feature flag for Stedi adapter. Default: false. */
  stediEnabled: boolean;
  /** Stedi API key (env: STEDI_API_KEY). */
  stediApiKey?: string;
  /** Stedi API endpoint (env: STEDI_API_ENDPOINT). */
  stediEndpoint?: string;
}

function loadConfig(): ClearinghouseGatewayConfig {
  const isProd = process.env.NODE_ENV === 'production' ||
    ['rc', 'prod'].includes(process.env.PLATFORM_RUNTIME_MODE ?? '');
  return {
    provider: (process.env.CLEARINGHOUSE_PROVIDER as ClearinghouseProvider) ?? 'generic',
    recordTraces: process.env.CLEARINGHOUSE_RECORD_TRACES !== 'false' && !isProd,
    replayMode: process.env.CLEARINGHOUSE_REPLAY_MODE === 'true',
    traceDir: process.env.CLEARINGHOUSE_TRACE_DIR ?? 'data/rcm/traces',
    maxTracesPerSet: Number(process.env.CLEARINGHOUSE_MAX_TRACES ?? '100'),
    stediEnabled: process.env.CLEARINGHOUSE_STEDI_ENABLED === 'true',
    stediApiKey: process.env.STEDI_API_KEY,
    stediEndpoint: process.env.STEDI_API_ENDPOINT ?? 'https://edi.stedi.com/2024-01-01',
  };
}

/* ── Content hashing ────────────────────────────────────────── */

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/* ── Trace Store ────────────────────────────────────────────── */

class TraceStore {
  private config: ClearinghouseGatewayConfig;
  private memoryTraces: TraceEntry[] = [];

  constructor(config: ClearinghouseGatewayConfig) {
    this.config = config;
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      if (!existsSync(this.config.traceDir)) {
        mkdirSync(this.config.traceDir, { recursive: true });
      }
    } catch {
      // Fallback to memory-only if filesystem not available
    }
  }

  record(entry: TraceEntry): void {
    this.memoryTraces.push(entry);

    // Persist to file
    try {
      const subDir = join(this.config.traceDir, entry.transactionSet);
      if (!existsSync(subDir)) mkdirSync(subDir, { recursive: true });

      const filename = `${entry.timestamp.replace(/[:.]/g, '-')}_${entry.id}.json`;
      writeFileSync(
        join(subDir, filename),
        JSON.stringify(entry, null, 2),
        'utf8',
      );

      // Trim old traces
      this.trimTraces(subDir);
    } catch {
      // Filesystem write failed, memory trace still available
    }
  }

  private trimTraces(dir: string): void {
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
      while (files.length > this.config.maxTracesPerSet) {
        const oldest = files.shift();
        if (oldest) {
          const { unlinkSync } = require('node:fs');
          unlinkSync(join(dir, oldest));
        }
      }
    } catch {
      // Trim failure is non-critical
    }
  }

  findReplay(transactionSet: X12TransactionSet, requestHash: string): ReplayMatch {
    // First check memory
    const memMatch = this.memoryTraces.find(
      t => t.transactionSet === transactionSet && t.requestHash === requestHash && t.response,
    );
    if (memMatch) {
      return {
        traceId: memMatch.id,
        matched: true,
        response: memMatch.response,
        result: memMatch.result ? {
          success: memMatch.result.success,
          transactionId: memMatch.result.transactionId,
          errors: [],
          metadata: { replayed: 'true', originalTraceId: memMatch.id },
        } : undefined,
      };
    }

    // Then check filesystem
    try {
      const subDir = join(this.config.traceDir, transactionSet);
      if (!existsSync(subDir)) return { traceId: '', matched: false };

      const files = readdirSync(subDir).filter(f => f.endsWith('.json')).sort().reverse();
      for (const file of files) {
        const raw = readFileSync(join(subDir, file), 'utf8');
        const entry: TraceEntry = JSON.parse(raw);
        if (entry.requestHash === requestHash && entry.response) {
          return {
            traceId: entry.id,
            matched: true,
            response: entry.response,
            result: entry.result ? {
              success: entry.result.success,
              transactionId: entry.result.transactionId,
              errors: [],
              metadata: { replayed: 'true', originalTraceId: entry.id },
            } : undefined,
          };
        }
      }
    } catch {
      // Filesystem read failed
    }

    return { traceId: '', matched: false };
  }

  listTraces(transactionSet?: X12TransactionSet, limit = 50): TraceEntry[] {
    let entries = this.memoryTraces;
    if (transactionSet) {
      entries = entries.filter(e => e.transactionSet === transactionSet);
    }
    return entries.slice(-limit);
  }

  getTrace(id: string): TraceEntry | undefined {
    return this.memoryTraces.find(t => t.id === id);
  }

  getStats(): Record<string, { count: number; lastAt?: string }> {
    const stats: Record<string, { count: number; lastAt?: string }> = {};
    for (const entry of this.memoryTraces) {
      const key = entry.transactionSet;
      if (!stats[key]) stats[key] = { count: 0 };
      stats[key].count++;
      stats[key].lastAt = entry.timestamp;
    }
    return stats;
  }
}

/* ── Stedi Adapter (feature-flagged) ────────────────────────── */

class StediAdapter {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async submit(transactionSet: X12TransactionSet, payload: string): Promise<ConnectorResult> {
    // Stedi EDI Core POST /translate
    // This is the scaffold — real Stedi integration would use their SDK
    const txId = `stedi-${Date.now()}-${randomBytes(4).toString('hex')}`;

    if (!this.apiKey) {
      return {
        success: false,
        errors: [{ code: 'STEDI_NO_KEY', description: 'STEDI_API_KEY not configured', severity: 'error' as const }],
      };
    }

    // In production mode, this would make a real HTTP call to Stedi
    // For now, return a structured pending result
    return {
      success: true,
      transactionId: txId,
      errors: [],
      metadata: {
        connector: 'stedi',
        endpoint: this.endpoint,
        transactionSet,
      },
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; details: string }> {
    return {
      healthy: !!this.apiKey,
      details: this.apiKey
        ? `Stedi configured (endpoint: ${this.endpoint})`
        : 'Stedi API key not configured',
    };
  }
}

/* ── Clearinghouse Gateway v2 ───────────────────────────────── */

export class ClearinghouseGatewayV2 {
  private config: ClearinghouseGatewayConfig;
  private traces: TraceStore;
  private stedi?: StediAdapter;
  private submissions: Map<string, ClearinghouseSubmission> = new Map();

  constructor(configOverride?: Partial<ClearinghouseGatewayConfig>) {
    const base = loadConfig();
    this.config = { ...base, ...configOverride };
    this.traces = new TraceStore(this.config);

    if (this.config.stediEnabled && this.config.stediApiKey) {
      this.stedi = new StediAdapter(
        this.config.stediApiKey,
        this.config.stediEndpoint ?? 'https://edi.stedi.com/2024-01-01',
      );
    }
  }

  /* ── Core Operations ─────────────────────────────────────── */

  /**
   * Submit an 837P/837I claim to the clearinghouse.
   */
  async submit837(
    payload: string,
    metadata: Record<string, string> = {},
  ): Promise<ClearinghouseSubmission> {
    const txSet: X12TransactionSet = (metadata.transactionSet as X12TransactionSet) ?? '837P';
    const submissionId = `sub-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const requestHash = hashContent(payload);
    const startMs = Date.now();

    // Check replay mode
    if (this.config.replayMode) {
      const replay = this.traces.findReplay(txSet, requestHash);
      if (replay.matched) {
        const submission: ClearinghouseSubmission = {
          id: submissionId,
          transactionSet: txSet,
          provider: this.config.provider,
          payload,
          metadata: { ...metadata, replayed: 'true', replayTraceId: replay.traceId },
          submittedAt: new Date().toISOString(),
          result: replay.result,
          durationMs: Date.now() - startMs,
        };
        this.submissions.set(submissionId, submission);
        return submission;
      }
    }

    // Route to the appropriate provider
    let result: ConnectorResult;
    if (this.config.provider === 'stedi' && this.stedi) {
      result = await this.stedi.submit(txSet, payload);
    } else {
      // Use existing ClearinghouseConnector from the registry
      const connector = this.resolveConnector();
      result = await connector.submit(txSet, payload, metadata);
    }

    const durationMs = Date.now() - startMs;

    // Build submission record
    const submission: ClearinghouseSubmission = {
      id: submissionId,
      transactionSet: txSet,
      provider: this.config.provider,
      payload,
      metadata,
      submittedAt: new Date().toISOString(),
      result,
      durationMs,
    };
    this.submissions.set(submissionId, submission);

    // Record trace
    if (this.config.recordTraces) {
      this.traces.record({
        id: `trace-${randomBytes(6).toString('hex')}`,
        timestamp: new Date().toISOString(),
        direction: 'outbound',
        transactionSet: txSet,
        provider: this.config.provider,
        requestHash,
        responseHash: result.responsePayload ? hashContent(result.responsePayload) : undefined,
        request: payload,
        response: result.responsePayload,
        metadata,
        durationMs,
        result: {
          success: result.success,
          transactionId: result.transactionId,
          errorCount: result.errors.length,
        },
      });
    }

    return submission;
  }

  /**
   * Submit a 276 claim status inquiry OR parse an inbound 277 response.
   */
  async check276277(
    payload: string,
    metadata: Record<string, string> = {},
  ): Promise<ClearinghouseSubmission> {
    const txSet: X12TransactionSet = '276';
    const submissionId = `chk-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const requestHash = hashContent(payload);
    const startMs = Date.now();

    if (this.config.replayMode) {
      const replay = this.traces.findReplay(txSet, requestHash);
      if (replay.matched) {
        const submission: ClearinghouseSubmission = {
          id: submissionId,
          transactionSet: txSet,
          provider: this.config.provider,
          payload,
          metadata: { ...metadata, replayed: 'true', replayTraceId: replay.traceId },
          submittedAt: new Date().toISOString(),
          result: replay.result,
          durationMs: Date.now() - startMs,
        };
        this.submissions.set(submissionId, submission);
        return submission;
      }
    }

    const connector = this.resolveConnector();
    const result = await connector.submit(txSet, payload, metadata);
    const durationMs = Date.now() - startMs;

    const submission: ClearinghouseSubmission = {
      id: submissionId,
      transactionSet: txSet,
      provider: this.config.provider,
      payload,
      metadata,
      submittedAt: new Date().toISOString(),
      result,
      durationMs,
    };
    this.submissions.set(submissionId, submission);

    if (this.config.recordTraces) {
      this.traces.record({
        id: `trace-${randomBytes(6).toString('hex')}`,
        timestamp: new Date().toISOString(),
        direction: 'outbound',
        transactionSet: txSet,
        provider: this.config.provider,
        requestHash,
        responseHash: result.responsePayload ? hashContent(result.responsePayload) : undefined,
        request: payload,
        response: result.responsePayload,
        metadata,
        durationMs,
        result: {
          success: result.success,
          transactionId: result.transactionId,
          errorCount: result.errors.length,
        },
      });
    }

    return submission;
  }

  /**
   * Poll for inbound 835 (remittance advice) responses.
   */
  async receive835(since?: string): Promise<ClearinghouseReceiveResult[]> {
    const connector = this.resolveConnector();
    const responses = await connector.fetchResponses(since);

    const results: ClearinghouseReceiveResult[] = responses
      .filter(r => r.transactionSet === '835')
      .map(r => ({
        ...r,
        contentHash: hashContent(r.payload),
      }));

    // Record inbound traces
    if (this.config.recordTraces) {
      for (const r of results) {
        this.traces.record({
          id: `trace-${randomBytes(6).toString('hex')}`,
          timestamp: new Date().toISOString(),
          direction: 'inbound',
          transactionSet: '835',
          provider: this.config.provider,
          requestHash: '',
          responseHash: r.contentHash,
          request: '',
          response: r.payload,
          metadata: {},
          result: { success: true, errorCount: 0 },
        });
      }
    }

    return results;
  }

  /* ── Query / Status ──────────────────────────────────────── */

  getSubmission(id: string): ClearinghouseSubmission | undefined {
    return this.submissions.get(id);
  }

  listSubmissions(limit = 50): ClearinghouseSubmission[] {
    return Array.from(this.submissions.values()).slice(-limit);
  }

  /* ── Trace Operations ────────────────────────────────────── */

  listTraces(transactionSet?: X12TransactionSet, limit = 50): TraceEntry[] {
    return this.traces.listTraces(transactionSet, limit);
  }

  getTrace(id: string): TraceEntry | undefined {
    return this.traces.getTrace(id);
  }

  getTraceStats(): Record<string, { count: number; lastAt?: string }> {
    return this.traces.getStats();
  }

  /* ── Health ──────────────────────────────────────────────── */

  async healthCheck(): Promise<{
    healthy: boolean;
    provider: ClearinghouseProvider;
    replayMode: boolean;
    recordTraces: boolean;
    stediStatus?: { healthy: boolean; details: string };
    connectorStatus?: { healthy: boolean; details?: string };
    traceStats: Record<string, { count: number; lastAt?: string }>;
  }> {
    let connectorStatus: { healthy: boolean; details?: string } | undefined;
    try {
      const connector = this.resolveConnector();
      connectorStatus = await connector.healthCheck();
    } catch {
      connectorStatus = { healthy: false, details: 'Connector not available' };
    }

    let stediStatus: { healthy: boolean; details: string } | undefined;
    if (this.stedi) {
      stediStatus = await this.stedi.healthCheck();
    }

    const healthy = this.config.replayMode ? true : (connectorStatus?.healthy ?? false);

    return {
      healthy,
      provider: this.config.provider,
      replayMode: this.config.replayMode,
      recordTraces: this.config.recordTraces,
      stediStatus,
      connectorStatus,
      traceStats: this.traces.getStats(),
    };
  }

  getConfig(): Omit<ClearinghouseGatewayConfig, 'stediApiKey'> {
    const { stediApiKey, ...safe } = this.config;
    return safe;
  }

  /* ── Internal ────────────────────────────────────────────── */

  private resolveConnector(): RcmConnector {
    // Try getting from the registry first
    const connector = getConnector('clearinghouse-edi');
    if (connector) return connector;

    // Fallback: create a minimal no-op connector
    return {
      id: 'clearinghouse-edi-fallback',
      name: 'Clearinghouse (fallback)',
      supportedModes: ['clearinghouse_edi'],
      supportedTransactions: ['837P', '837I', '835', '276', '277', '999', 'TA1'],
      async initialize() {},
      async submit(_txSet, _payload, _meta) {
        return {
          success: false,
          errors: [{ code: 'NO_CONNECTOR', description: 'Clearinghouse connector not initialized', severity: 'error' as const }],
        };
      },
      async checkStatus(_txId) {
        return { success: false, errors: [{ code: 'NO_CONNECTOR', description: 'Not available', severity: 'error' as const }] };
      },
      async fetchResponses() { return []; },
      async healthCheck() { return { healthy: false, details: 'Connector not registered' }; },
      async shutdown() {},
    };
  }
}

/* ── Singleton ──────────────────────────────────────────────── */

let instance: ClearinghouseGatewayV2 | null = null;

export function getClearinghouseGateway(config?: Partial<ClearinghouseGatewayConfig>): ClearinghouseGatewayV2 {
  if (!instance) {
    instance = new ClearinghouseGatewayV2(config);
  }
  return instance;
}

export function resetClearinghouseGateway(): void {
  instance = null;
}
