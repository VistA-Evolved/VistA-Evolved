/**
 * AI Gateway -- Provider Registry (Phase 33)
 *
 * Pluggable model backends. Only registered providers may be used.
 * The stub provider is always available for development.
 * Production providers (OpenAI, Anthropic, Ollama, vLLM) implement
 * the same AIProvider interface.
 */

import type { AIProvider } from '../types.js';
import { stubProvider } from './stub-provider.js';

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const providerRegistry = new Map<string, AIProvider>();

// Seed stub provider
providerRegistry.set(stubProvider.id, stubProvider);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Register a provider adapter. */
export function registerProvider(provider: AIProvider): void {
  providerRegistry.set(provider.id, provider);
}

/** Get a provider by ID. */
export function getProvider(id: string): AIProvider | null {
  return providerRegistry.get(id) ?? null;
}

/** List all registered providers. */
export function listProviders(): AIProvider[] {
  return Array.from(providerRegistry.values());
}

/** Check if a provider is registered. */
export function hasProvider(id: string): boolean {
  return providerRegistry.has(id);
}
