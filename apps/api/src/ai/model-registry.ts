/**
 * AI Gateway — Model Registry (Phase 33)
 *
 * Approved models only. No ad-hoc model invocations.
 * Each model has governance metadata: deployment, PHI handling,
 * allowed use cases, status.
 */

import type { ModelConfig, ModelStatus } from './types.js';

/* ------------------------------------------------------------------ */
/* In-memory registry (upgradeable to VistA file in future)           */
/* ------------------------------------------------------------------ */

const models = new Map<string, ModelConfig>();

/* ------------------------------------------------------------------ */
/* Built-in models                                                     */
/* ------------------------------------------------------------------ */

/** Stub model for development and testing — always available. */
const STUB_MODEL: ModelConfig = {
  id: 'stub-v1',
  name: 'Development Stub',
  provider: 'stub',
  deployment: 'on-premises',
  phiAllowed: true,
  status: 'active',
  maxInputTokens: 8192,
  maxOutputTokens: 2048,
  allowedUseCases: ['intake-summary', 'lab-education', 'portal-search', 'custom'],
  registeredAt: new Date().toISOString(),
};

// Seed stub on module load
models.set(STUB_MODEL.id, STUB_MODEL);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Register a new model. Rejects duplicate IDs. */
export function registerModel(config: ModelConfig): { ok: boolean; error?: string } {
  if (models.has(config.id)) {
    return { ok: false, error: `Model '${config.id}' already registered` };
  }
  if (!config.id || !config.provider) {
    return { ok: false, error: 'Model ID and provider are required' };
  }
  models.set(config.id, { ...config, registeredAt: new Date().toISOString() });
  return { ok: true };
}

/** Get a model by ID. Returns null if not found or disabled. */
export function getModel(id: string): ModelConfig | null {
  const m = models.get(id);
  if (!m) return null;
  if (m.status === 'disabled') return null;
  return m;
}

/** Get the best available model for a use case. */
export function resolveModel(useCase: string, preferredId?: string): ModelConfig | null {
  // Try preferred model first
  if (preferredId) {
    const preferred = models.get(preferredId);
    if (preferred && preferred.status === 'active' && preferred.allowedUseCases.includes(useCase)) {
      return preferred;
    }
  }
  // Fall back to first active model supporting this use case
  for (const m of models.values()) {
    if (m.status === 'active' && m.allowedUseCases.includes(useCase)) {
      return m;
    }
  }
  return null;
}

/** List all registered models (includes deprecated, excludes disabled). */
export function listModels(): ModelConfig[] {
  return Array.from(models.values()).filter((m) => m.status !== 'disabled');
}

/** Update model status (active/deprecated/disabled). */
export function setModelStatus(id: string, status: ModelStatus): { ok: boolean; error?: string } {
  const m = models.get(id);
  if (!m) return { ok: false, error: `Model '${id}' not found` };
  m.status = status;
  return { ok: true };
}

/** Check if a model can handle PHI (on-premises + phiAllowed). */
export function canHandlePhi(modelId: string): boolean {
  const m = models.get(modelId);
  if (!m) return false;
  return m.phiAllowed && m.deployment === 'on-premises';
}

/** Get total registered model count. */
export function getModelCount(): number {
  return models.size;
}
