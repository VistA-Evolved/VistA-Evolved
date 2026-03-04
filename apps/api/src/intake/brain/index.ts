/**
 * Intake Brain Module — Barrel Export (Phase 143)
 *
 * Initializes brain plugin registry with all available providers.
 * Rules engine is always registered. LLM and 3P are opt-in.
 */

export type {
  IntakeBrainPlugin,
  BrainProviderId,
  BrainProviderFamily,
  BrainProviderHealth,
  BrainProviderCapabilities,
  BrainSessionState,
  BrainNextQuestionResult,
  BrainSubmitResult,
  BrainSummaryResult,
  BrainDecisionAudit,
} from './types.js';

export { parseBrainProviderId } from './types.js';

export {
  registerBrainPlugin,
  unregisterBrainPlugin,
  getBrainPlugin,
  resolveBrainPlugin,
  listBrainPlugins,
  checkAllBrainHealth,
  logBrainDecision,
  getBrainDecisionAudit,
  getBrainAuditStats,
  hashForAudit,
} from './registry.js';

export { RulesEngineBrain } from './rules-engine.js';
export { LlmBrainPlugin } from './llm-provider.js';
export { ThirdPartyBrainPlugin } from './third-party-connector.js';

import { registerBrainPlugin } from './registry.js';
import { RulesEngineBrain } from './rules-engine.js';
import { LlmBrainPlugin } from './llm-provider.js';
import { ThirdPartyBrainPlugin } from './third-party-connector.js';
import { log } from '../../lib/logger.js';

/**
 * Initialize all brain plugins. Call once at startup.
 * Rules engine is always registered. Others based on env vars.
 */
export function initBrainPlugins(): void {
  // 1. Rules engine — ALWAYS available (mandatory fallback)
  registerBrainPlugin(new RulesEngineBrain());

  // 2. LLM provider — opt-in via INTAKE_LLM_ENABLED
  if (process.env.INTAKE_LLM_ENABLED === 'true') {
    const variant = process.env.INTAKE_LLM_VARIANT ?? 'default';
    registerBrainPlugin(new LlmBrainPlugin(variant));
    log.info(`LLM brain registered: llm_provider:${variant}`);
  }

  // 3. Third-party connectors — register if API keys present
  const thirdPartyVendors = (process.env.INTAKE_3P_VENDORS ?? '').split(',').filter(Boolean);
  for (const vendor of thirdPartyVendors) {
    registerBrainPlugin(new ThirdPartyBrainPlugin(vendor.trim()));
    log.info(`3P brain registered: third_party:${vendor.trim()}`);
  }

  // Always log what got registered
  log.info('Brain plugin initialization complete');
}
