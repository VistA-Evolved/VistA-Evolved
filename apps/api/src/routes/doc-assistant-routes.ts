/**
 * VistA Documentation Assistant API Routes (Phase VII)
 *
 * Endpoints:
 *   GET /docs/search?q=...        Search across all 157 module docs
 *   GET /docs/package/:prefix     Get full doc for a specific package
 *   GET /docs/stats               Get index statistics
 */

import type { FastifyInstance } from 'fastify';
import { searchDocs, getPackageDoc, getDocStats } from '../ai/vista-doc-assistant.js';

export async function docAssistantRoutes(server: FastifyInstance): Promise<void> {
  server.get('/docs/search', async (request) => {
    const q = (request.query as Record<string, string>)?.q || '';
    const limit = parseInt((request.query as Record<string, string>)?.limit || '10');
    if (!q.trim()) {
      return { ok: false, error: 'q parameter is required' };
    }
    const results = searchDocs(q.trim(), Math.min(limit, 50));
    return { ok: true, ...results };
  });

  server.get('/docs/package/:prefix', async (request) => {
    const prefix = (request.params as Record<string, string>)?.prefix || '';
    if (!prefix.trim()) {
      return { ok: false, error: 'prefix parameter is required' };
    }
    const chunks = getPackageDoc(prefix.trim());
    return {
      ok: true,
      prefix: prefix.toUpperCase(),
      sections: chunks.length,
      chunks,
    };
  });

  server.get('/docs/stats', async () => {
    return { ok: true, ...getDocStats() };
  });
}
