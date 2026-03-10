/**
 * Phase 403 (W23-P5): Document Exchange -- Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { log } from '../lib/logger.js';
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  searchDocuments,
  createSubmissionSet,
  getSubmissionSet,
  listSubmissionSets,
  getDocumentExchangeDashboardStats,
} from './exchange-store.js';

export default async function documentExchangeRoutes(server: FastifyInstance): Promise<void> {
  // --- Documents ---------------------------------------------

  server.get(
    '/document-exchange/documents',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const qs = (request.query || {}) as Record<string, string>;
      return {
        ok: true,
        documents: listDocuments(session.tenantId, {
          dfn: qs.dfn,
          category: qs.category,
          status: qs.status,
        }),
      };
    }
  );

  server.get(
    '/document-exchange/documents/search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const qs = (request.query || {}) as Record<string, string>;
      return { ok: true, documents: searchDocuments(session.tenantId, qs.q || '') };
    }
  );

  server.get(
    '/document-exchange/documents/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const rec = getDocument(id);
      if (!rec) return reply.code(404).send({ ok: false, error: 'Not found' });
      return { ok: true, document: rec };
    }
  );

  server.post(
    '/document-exchange/documents',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body || {}) as Record<string, any>;
      try {
        const rec = createDocument({
          tenantId: session.tenantId,
          masterIdentifier: body.masterIdentifier,
          status: body.status || 'current',
          category: body.category || 'other',
          type: body.type,
          subject: body.subject || { dfn: '' },
          author: body.author || { name: session.userName || 'Unknown' },
          date: body.date || new Date().toISOString(),
          description: body.description,
          format: body.format || 'text/plain',
          mimeType: body.mimeType || 'text/plain',
          size: body.size,
          url: body.url,
          content: body.content,
          securityLabel: body.securityLabel,
          relatesTo: body.relatesTo,
          metadata: body.metadata,
        });
        return reply.code(201).send({ ok: true, document: rec });
      } catch (err: any) {
        log.error('Document creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(400).send({ ok: false, error: 'Create failed' });
      }
    }
  );

  server.put(
    '/document-exchange/documents/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as Record<string, any>;
      const rec = updateDocument(id, { ...body, tenantId: session.tenantId });
      if (!rec) return reply.code(404).send({ ok: false, error: 'Not found' });
      return { ok: true, document: rec };
    }
  );

  // --- Submission Sets ---------------------------------------

  server.get(
    '/document-exchange/submissions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, submissions: listSubmissionSets(session.tenantId) };
    }
  );

  server.get(
    '/document-exchange/submissions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const rec = getSubmissionSet(id);
      if (!rec) return reply.code(404).send({ ok: false, error: 'Not found' });
      return { ok: true, submission: rec };
    }
  );

  server.post(
    '/document-exchange/submissions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body || {}) as Record<string, any>;
      try {
        const rec = createSubmissionSet({
          tenantId: session.tenantId,
          sourceId: body.sourceId || '',
          submissionTime: body.submissionTime || new Date().toISOString(),
          author: body.author || { name: session.userName || 'Unknown' },
          documentIds: body.documentIds || [],
          status: body.status || 'submitted',
          metadata: body.metadata,
        });
        return reply.code(201).send({ ok: true, submission: rec });
      } catch (err: any) {
        log.error('Submission set creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(400).send({ ok: false, error: 'Create failed' });
      }
    }
  );

  // --- Dashboard ---------------------------------------------

  server.get(
    '/document-exchange/dashboard',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, stats: getDocumentExchangeDashboardStats(session.tenantId) };
    }
  );
}
