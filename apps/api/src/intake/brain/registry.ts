/**
 * Intake Brain Plugin Registry (Phase 143)
 *
 * Central registry for all brain providers. Rules engine is always
 * registered. LLM and 3P providers are opt-in via env vars.
 *
 * Fallback chain: requested provider -> rules_engine (always)
 */

import type {
  IntakeBrainPlugin,
  BrainProviderId,
  BrainProviderFamily,
  BrainProviderHealth,
  BrainDecisionAudit,
} from './types.js';
import { parseBrainProviderId } from './types.js';
import { randomBytes, createHash } from 'node:crypto';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Registry Store                                                       */
/* ------------------------------------------------------------------ */

const plugins = new Map<BrainProviderId, IntakeBrainPlugin>();
const decisionAuditLog: BrainDecisionAudit[] = [];

const MAX_AUDIT_ENTRIES = 50_000;

/* ------------------------------------------------------------------ */
/* Registration                                                         */
/* ------------------------------------------------------------------ */

export function registerBrainPlugin(plugin: IntakeBrainPlugin): void {
  if (plugins.has(plugin.id)) {
    log.warn(`Brain plugin ${plugin.id} already registered, replacing`);
  }
  plugins.set(plugin.id, plugin);
  log.info(`Brain plugin registered: ${plugin.id} (${plugin.family})`);
}

export function unregisterBrainPlugin(id: BrainProviderId): boolean {
  if (id === 'rules_engine') {
    log.warn('Cannot unregister rules_engine -- it is the mandatory fallback');
    return false;
  }
  return plugins.delete(id);
}

/* ------------------------------------------------------------------ */
/* Resolution                                                           */
/* ------------------------------------------------------------------ */

export function getBrainPlugin(id: BrainProviderId): IntakeBrainPlugin | undefined {
  return plugins.get(id);
}

/**
 * Resolve a provider with fallback chain.
 * If the requested provider is unavailable, falls back to rules_engine.
 */
export function resolveBrainPlugin(requestedId: BrainProviderId): {
  plugin: IntakeBrainPlugin;
  fellBack: boolean;
  originalId: BrainProviderId;
} {
  const plugin = plugins.get(requestedId);
  if (plugin) {
    return { plugin, fellBack: false, originalId: requestedId };
  }

  // Try family match (e.g., "llm_constrained" -> any llm_provider:*)
  const parsed = parseBrainProviderId(requestedId);
  if (parsed.family !== 'rules_engine') {
    for (const [id, p] of plugins) {
      if (p.family === parsed.family) {
        log.info(`Brain provider ${requestedId} not found, using family match: ${id}`);
        return { plugin: p, fellBack: true, originalId: requestedId };
      }
    }
  }

  // Final fallback: rules_engine
  const rules = plugins.get('rules_engine');
  if (rules) {
    if (requestedId !== 'rules_engine' && requestedId !== 'rules') {
      log.warn(`Brain provider ${requestedId} not found, falling back to rules_engine`);
    }
    return {
      plugin: rules,
      fellBack: requestedId !== 'rules_engine' && requestedId !== 'rules',
      originalId: requestedId,
    };
  }

  // Should never happen -- rules_engine is always registered
  throw new Error('CRITICAL: rules_engine brain plugin not registered');
}

/* ------------------------------------------------------------------ */
/* Listing                                                              */
/* ------------------------------------------------------------------ */

export interface BrainPluginInfo {
  id: BrainProviderId;
  name: string;
  family: BrainProviderFamily;
  capabilities: ReturnType<IntakeBrainPlugin['getCapabilities']>;
}

export function listBrainPlugins(): BrainPluginInfo[] {
  const result: BrainPluginInfo[] = [];
  for (const plugin of plugins.values()) {
    result.push({
      id: plugin.id,
      name: plugin.name,
      family: plugin.family,
      capabilities: plugin.getCapabilities(),
    });
  }
  return result;
}

export async function checkAllBrainHealth(): Promise<BrainProviderHealth[]> {
  const results: BrainProviderHealth[] = [];
  for (const plugin of plugins.values()) {
    try {
      const health = await plugin.healthCheck();
      results.push(health);
    } catch (err: any) {
      results.push({
        providerId: plugin.id,
        family: plugin.family,
        status: 'unavailable',
        lastCheckAt: new Date().toISOString(),
        detail: err?.message ?? 'Health check failed',
      });
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Decision Audit                                                       */
/* ------------------------------------------------------------------ */

export function logBrainDecision(
  audit: Omit<BrainDecisionAudit, 'id' | 'timestamp'>
): BrainDecisionAudit {
  const entry: BrainDecisionAudit = {
    ...audit,
    id: randomBytes(16).toString('hex'),
    timestamp: new Date().toISOString(),
  };
  decisionAuditLog.push(entry);

  // Trim old entries
  if (decisionAuditLog.length > MAX_AUDIT_ENTRIES) {
    decisionAuditLog.splice(0, decisionAuditLog.length - MAX_AUDIT_ENTRIES * 0.8);
  }

  return entry;
}

export function getBrainDecisionAudit(opts?: {
  sessionId?: string;
  providerId?: string;
  limit?: number;
}): BrainDecisionAudit[] {
  let filtered = decisionAuditLog;
  if (opts?.sessionId) {
    filtered = filtered.filter((d) => d.sessionId === opts.sessionId);
  }
  if (opts?.providerId) {
    filtered = filtered.filter((d) => d.providerId === opts.providerId);
  }
  const limit = opts?.limit ?? 100;
  return filtered.slice(-limit);
}

export function getBrainAuditStats(): {
  totalDecisions: number;
  byProvider: Record<string, number>;
  byDecisionType: Record<string, number>;
  llmUsageCount: number;
  fallbackCount: number;
} {
  const byProvider: Record<string, number> = {};
  const byDecisionType: Record<string, number> = {};
  let llmUsageCount = 0;
  let fallbackCount = 0;

  for (const d of decisionAuditLog) {
    byProvider[d.providerId] = (byProvider[d.providerId] ?? 0) + 1;
    byDecisionType[d.decisionType] = (byDecisionType[d.decisionType] ?? 0) + 1;
    if (d.usedLlm) llmUsageCount++;
    if (d.fellBackToRules) fallbackCount++;
  }

  return {
    totalDecisions: decisionAuditLog.length,
    byProvider,
    byDecisionType,
    llmUsageCount,
    fallbackCount,
  };
}

/** Hash inputs for audit (no PHI in the hash) */
export function hashForAudit(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}
