/**
 * Phase 400 (W23-P2): Interop Gateway Layer — Store
 *
 * In-memory stores for channels, transform pipelines, transactions, and
 * mediator configs. Follows the project's store pattern (FIFO eviction,
 * registered in store-policy.ts).
 */

import { randomBytes } from 'crypto';
import type {
  GatewayChannel,
  TransformPipeline,
  GatewayTransaction,
  MediatorConfig,
  GatewayDashboardStats,
  ChannelStatus,
  TransactionStatus,
} from './types.js';

const MAX_CHANNELS = 5_000;
const MAX_PIPELINES = 5_000;
const MAX_TRANSACTIONS = 50_000;
const MAX_MEDIATORS = 100;

// ─── Stores ────────────────────────────────────────────────

const channelStore = new Map<string, GatewayChannel>();
const pipelineStore = new Map<string, TransformPipeline>();
const transactionStore = new Map<string, GatewayTransaction>();
const mediatorStore = new Map<string, MediatorConfig>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

// ─── Channel Operations ────────────────────────────────────

export function createChannel(
  input: Omit<GatewayChannel, 'id' | 'createdAt' | 'updatedAt'>
): GatewayChannel {
  enforceMax(channelStore, MAX_CHANNELS);
  const now = new Date().toISOString();
  const ch: GatewayChannel = { ...input, id: genId('ch'), createdAt: now, updatedAt: now };
  channelStore.set(ch.id, ch);
  return ch;
}

export function getChannel(id: string): GatewayChannel | undefined {
  return channelStore.get(id);
}

export function listChannels(tenantId: string): GatewayChannel[] {
  return Array.from(channelStore.values()).filter((c) => c.tenantId === tenantId);
}

export function updateChannel(
  id: string,
  patch: Partial<GatewayChannel>
): GatewayChannel | undefined {
  const ch = channelStore.get(id);
  if (!ch) return undefined;
  const updated: GatewayChannel = {
    ...ch,
    ...patch,
    id: ch.id,
    createdAt: ch.createdAt,
    updatedAt: new Date().toISOString(),
  };
  channelStore.set(id, updated);
  return updated;
}

export function updateChannelStatus(id: string, status: ChannelStatus): GatewayChannel | undefined {
  return updateChannel(id, { status });
}

export function deleteChannel(id: string): boolean {
  return channelStore.delete(id);
}

// ─── Transform Pipeline Operations ────────────────────────

export function createPipeline(
  input: Omit<TransformPipeline, 'id' | 'createdAt' | 'updatedAt'>
): TransformPipeline {
  enforceMax(pipelineStore, MAX_PIPELINES);
  const now = new Date().toISOString();
  const p: TransformPipeline = { ...input, id: genId('tp'), createdAt: now, updatedAt: now };
  pipelineStore.set(p.id, p);
  return p;
}

export function getPipeline(id: string): TransformPipeline | undefined {
  return pipelineStore.get(id);
}

export function listPipelines(tenantId: string): TransformPipeline[] {
  return Array.from(pipelineStore.values()).filter((p) => p.tenantId === tenantId);
}

export function updatePipeline(
  id: string,
  patch: Partial<TransformPipeline>
): TransformPipeline | undefined {
  const p = pipelineStore.get(id);
  if (!p) return undefined;
  const updated: TransformPipeline = {
    ...p,
    ...patch,
    id: p.id,
    createdAt: p.createdAt,
    updatedAt: new Date().toISOString(),
  };
  pipelineStore.set(id, updated);
  return updated;
}

export function deletePipeline(id: string): boolean {
  return pipelineStore.delete(id);
}

// ─── Transaction Operations ────────────────────────────────

export function recordTransaction(
  input: Omit<GatewayTransaction, 'id' | 'createdAt'>
): GatewayTransaction {
  enforceMax(transactionStore, MAX_TRANSACTIONS);
  const tx: GatewayTransaction = { ...input, id: genId('tx'), createdAt: new Date().toISOString() };
  transactionStore.set(tx.id, tx);
  return tx;
}

export function getTransaction(id: string): GatewayTransaction | undefined {
  return transactionStore.get(id);
}

export function listTransactions(
  tenantId: string,
  opts?: { channelId?: string; status?: TransactionStatus; limit?: number }
): GatewayTransaction[] {
  let results = Array.from(transactionStore.values()).filter((t) => t.tenantId === tenantId);
  if (opts?.channelId) results = results.filter((t) => t.channelId === opts.channelId);
  if (opts?.status) results = results.filter((t) => t.status === opts.status);
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return results.slice(0, opts?.limit || 100);
}

export function completeTransaction(
  id: string,
  status: TransactionStatus,
  responseSummary?: string,
  errorDetail?: string
): GatewayTransaction | undefined {
  const tx = transactionStore.get(id);
  if (!tx) return undefined;
  const updated: GatewayTransaction = {
    ...tx,
    status,
    responseSummary: responseSummary || tx.responseSummary,
    errorDetail: errorDetail || tx.errorDetail,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - new Date(tx.createdAt).getTime(),
  };
  transactionStore.set(id, updated);
  return updated;
}

// ─── Mediator Operations ───────────────────────────────────

export function createMediator(
  input: Omit<MediatorConfig, 'id' | 'createdAt' | 'updatedAt'>
): MediatorConfig {
  enforceMax(mediatorStore, MAX_MEDIATORS);
  const now = new Date().toISOString();
  const m: MediatorConfig = { ...input, id: genId('med'), createdAt: now, updatedAt: now };
  mediatorStore.set(m.id, m);
  return m;
}

export function getMediator(id: string): MediatorConfig | undefined {
  return mediatorStore.get(id);
}

export function listMediators(tenantId: string): MediatorConfig[] {
  return Array.from(mediatorStore.values()).filter((m) => m.tenantId === tenantId);
}

export function updateMediator(
  id: string,
  patch: Partial<MediatorConfig>
): MediatorConfig | undefined {
  const m = mediatorStore.get(id);
  if (!m) return undefined;
  const updated: MediatorConfig = {
    ...m,
    ...patch,
    id: m.id,
    createdAt: m.createdAt,
    updatedAt: new Date().toISOString(),
  };
  mediatorStore.set(id, updated);
  return updated;
}

export function deleteMediator(id: string): boolean {
  return mediatorStore.delete(id);
}

// ─── Route Transaction (simulate gateway flow) ────────────

export function routeTransaction(
  tenantId: string,
  channelId: string,
  payload: string
): GatewayTransaction {
  const ch = channelStore.get(channelId);
  if (!ch || ch.tenantId !== tenantId) {
    return recordTransaction({
      tenantId,
      channelId,
      direction: 'inbound',
      status: 'rejected',
      sourceMessageId: null,
      transformPipelineId: null,
      requestSummary: payload.slice(0, 200),
      responseSummary: null,
      errorDetail: ch ? 'Tenant mismatch' : 'Channel not found',
      durationMs: 0,
      completedAt: new Date().toISOString(),
    });
  }

  const tx = recordTransaction({
    tenantId,
    channelId,
    direction: ch.direction,
    status: 'processing',
    sourceMessageId: genId('msg'),
    transformPipelineId: ch.transformPipelineId,
    requestSummary: payload.slice(0, 200),
    responseSummary: null,
    errorDetail: null,
    durationMs: null,
    completedAt: null,
  });

  // Simulate transform + routing
  const result = completeTransaction(tx.id, 'completed', 'Routed successfully');
  return result || tx;
}

// ─── Dashboard Stats ───────────────────────────────────────

export function getGatewayDashboardStats(tenantId: string): GatewayDashboardStats {
  const channels = listChannels(tenantId);
  const pipelines = listPipelines(tenantId);
  const txns = Array.from(transactionStore.values()).filter((t) => t.tenantId === tenantId);
  const failed = txns.filter((t) => t.status === 'failed' || t.status === 'rejected');
  const durations = txns.filter((t) => t.durationMs != null).map((t) => t.durationMs!);
  const avgDuration =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    totalChannels: channels.length,
    activeChannels: channels.filter((c) => c.status === 'active').length,
    totalPipelines: pipelines.length,
    totalTransactions: txns.length,
    failedTransactions: failed.length,
    avgDurationMs: Math.round(avgDuration),
  };
}
