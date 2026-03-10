/**
 * External Translator Adapter -- Feature-flagged Stedi-like X12 API
 *
 * Phase 45: Delegates X12 build/parse to an external translation API
 * (e.g., Stedi, Edifecs, Kaulkin). Feature-flagged via:
 *   - EXTERNAL_TRANSLATOR_ENABLED=true
 *   - EXTERNAL_TRANSLATOR_ENDPOINT=https://...
 *   - EXTERNAL_TRANSLATOR_API_KEY stored in env (never in repo)
 *
 * When disabled or unavailable, falls back to LocalScaffoldTranslator
 * via the translator registry's getActiveTranslator().
 *
 * No API keys or secrets are stored in this file.
 */

import type { Translator } from './translator.js';
import type { TranslatorResult, ParsedResponse, TransactionEnvelope } from './types.js';
import type { X12TransactionSet } from '../edi/types.js';

/* -- Environment config ---------------------------------------- */

function getConfig(): { enabled: boolean; endpoint: string; apiKey: string } {
  return {
    enabled: process.env.EXTERNAL_TRANSLATOR_ENABLED === 'true',
    endpoint: process.env.EXTERNAL_TRANSLATOR_ENDPOINT ?? '',
    apiKey: process.env.EXTERNAL_TRANSLATOR_API_KEY ?? '',
  };
}

/* -- External Translator Adapter ------------------------------- */

export const externalTranslatorAdapter: Translator = {
  id: 'external',
  name: 'External Translator API (Stedi-compatible)',

  isAvailable(): boolean {
    const cfg = getConfig();
    return cfg.enabled && cfg.endpoint.length > 0 && cfg.apiKey.length > 0;
  },

  validate(
    transactionSet: X12TransactionSet,
    canonicalObject: Record<string, unknown>
  ): Array<{ field: string; message: string; severity: 'error' | 'warning' }> {
    // Basic structural checks -- real validation done by external API
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];

    if (!canonicalObject || typeof canonicalObject !== 'object') {
      errors.push({
        field: 'root',
        message: 'Canonical object is missing or not an object',
        severity: 'error',
      });
    }

    return errors;
  },

  buildX12(
    transactionSet: X12TransactionSet,
    canonicalObject: Record<string, unknown>,
    envelope: TransactionEnvelope
  ): TranslatorResult {
    const cfg = getConfig();

    if (!cfg.enabled || !cfg.endpoint) {
      // Return a placeholder indicating external translator is not configured
      return {
        x12Payload: '',
        envelope,
        segmentCount: 0,
        byteSize: 0,
      };
    }

    // In a real implementation, this would:
    // 1. POST to cfg.endpoint with { transactionSet, data: canonicalObject, envelope }
    // 2. Include Authorization: Bearer ${cfg.apiKey} header
    // 3. Parse the response { x12: string, metadata: { segmentCount, ... } }
    // 4. Return the structured result
    //
    // Example (commented out -- no real HTTP calls in scaffold):
    // const response = await fetch(`${cfg.endpoint}/translate`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${cfg.apiKey}`,
    //   },
    //   body: JSON.stringify({ transactionSet, data: canonicalObject, envelope }),
    // });
    // const result = await response.json();
    // return { x12Payload: result.x12, envelope, segmentCount: result.segmentCount, byteSize: result.byteSize };

    // Scaffold returns empty -- external not yet connected
    return {
      x12Payload: `{external-translator-placeholder:${transactionSet}}`,
      envelope,
      segmentCount: 0,
      byteSize: 0,
    };
  },

  parseX12(transactionSet: X12TransactionSet, rawX12: string): ParsedResponse {
    const cfg = getConfig();

    if (!cfg.enabled || !cfg.endpoint) {
      return {
        transactionSet,
        canonical: {},
        accepted: false,
        errors: [
          {
            code: 'NOT_CONFIGURED',
            description: 'External translator not configured',
            severity: 'error',
          },
        ],
      };
    }

    // In a real implementation, this would:
    // POST to cfg.endpoint/parse with { transactionSet, x12: rawX12 }
    // Parse the response into a canonical object

    // Scaffold returns empty
    return {
      transactionSet,
      canonical: { raw: rawX12, note: 'External translator parse not yet connected' },
      accepted: false,
      errors: [
        {
          code: 'SCAFFOLD',
          description: 'External translator scaffold -- not connected',
          severity: 'warning',
        },
      ],
    };
  },
};
