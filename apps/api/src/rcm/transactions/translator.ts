/**
 * Translator Interface — Pluggable X12 Translation Strategy
 *
 * Phase 45: Defines the contract for converting between canonical
 * domain objects and X12 wire format. Two implementations:
 *   1) LocalScaffoldTranslator — built-in, limited, for dev/sandbox
 *   2) ExternalTranslatorAdapter — feature-flagged, for Stedi-like APIs
 *
 * The translator does NOT interpret proprietary code sets or embed
 * copyrighted implementation guide content.
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { TranslatorResult, ParsedResponse, TransactionEnvelope } from './types.js';

/* ── Translator interface ────────────────────────────────────── */

export interface Translator {
  /** Unique identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Whether this translator is available (feature-flagged) */
  isAvailable(): boolean;

  /**
   * Build X12 wire format from a canonical domain object.
   * Returns the X12 string + envelope metadata.
   */
  buildX12(
    transactionSet: X12TransactionSet,
    canonicalObject: Record<string, unknown>,
    envelope: TransactionEnvelope
  ): TranslatorResult;

  /**
   * Parse X12 wire format into a canonical response object.
   */
  parseX12(transactionSet: X12TransactionSet, rawX12: string): ParsedResponse;

  /**
   * Validate a canonical object before serialization.
   * Returns an array of blocking errors (empty = valid).
   */
  validate(
    transactionSet: X12TransactionSet,
    canonicalObject: Record<string, unknown>
  ): Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
}

/* ── Translator Registry ─────────────────────────────────────── */

const translators = new Map<string, Translator>();

export function registerTranslator(translator: Translator): void {
  translators.set(translator.id, translator);
}

export function getTranslator(id: string): Translator | undefined {
  return translators.get(id);
}

export function getActiveTranslator(): Translator | undefined {
  // Prefer external translator if available, fall back to local scaffold
  const external = translators.get('external');
  if (external?.isAvailable()) return external;
  return translators.get('local-scaffold');
}

export function listTranslators(): Array<{ id: string; name: string; available: boolean }> {
  return Array.from(translators.values()).map((t) => ({
    id: t.id,
    name: t.name,
    available: t.isAvailable(),
  }));
}
