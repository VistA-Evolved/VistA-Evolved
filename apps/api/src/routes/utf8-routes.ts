/**
 * UTF-8 Routes — Phase 498 (W34-P8)
 *
 * Endpoints to test and report UTF-8 round-trip fidelity through VistA.
 * Admin-only. No PHI in test strings.
 */

import type { FastifyInstance } from 'fastify';
import {
  buildTestCorpus,
  validateRoundTrip,
  summarizeResults,
  type Utf8RoundTripResult,
} from '../vista/utf8-roundtrip.js';

export async function utf8Routes(app: FastifyInstance): Promise<void> {
  // GET /vista/utf8/status — UTF-8 support status summary
  app.get('/vista/utf8/status', async () => {
    const corpus = buildTestCorpus();
    const scripts = [...new Set(corpus.map((c) => c.script))];
    const locales = [...new Set(corpus.map((c) => c.locale))];

    return {
      ok: true,
      corpus: {
        total: corpus.length,
        scripts,
        locales,
      },
      note: 'Use POST /vista/utf8/test to run actual round-trip tests',
      vistaStatus: 'integration-pending',
      vistaNote: 'VistA round-trip requires active broker connection. Use POST endpoint to test.',
    };
  });

  // POST /vista/utf8/test — run UTF-8 round-trip test
  // In the current scaffold, this does a local encode/decode test.
  // When VistA is wired, this will send strings through RPC and compare.
  app.post('/vista/utf8/test', async (request) => {
    const body = (request.body as Record<string, unknown>) || {};
    const filterScript = body.script as string | undefined;
    const filterLocale = body.locale as string | undefined;

    let corpus = buildTestCorpus();
    if (filterScript) {
      corpus = corpus.filter((c) => c.script === filterScript);
    }
    if (filterLocale) {
      corpus = corpus.filter((c) => c.locale === filterLocale);
    }

    // Local round-trip: encode to Buffer and decode back
    // This validates Node.js UTF-8 handling. VistA round-trip is next step.
    const results: Utf8RoundTripResult[] = corpus.map((test) => {
      try {
        const encoded = Buffer.from(test.input, 'utf-8');
        const decoded = encoded.toString('utf-8');
        return validateRoundTrip(test, decoded, null);
      } catch (_err: any) {
        return validateRoundTrip(test, null, 'Encoding error');
      }
    });

    const summary = summarizeResults(results);

    return {
      ok: true,
      mode: 'local',
      modeNote: 'Local Node.js UTF-8 encode/decode. VistA round-trip requires broker connection.',
      summary,
      results,
    };
  });

  // GET /vista/utf8/corpus — return the test corpus without running tests
  app.get('/vista/utf8/corpus', async () => {
    const corpus = buildTestCorpus();
    return { ok: true, corpus, total: corpus.length };
  });
}
