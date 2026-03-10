/**
 * Remittance Routes -- Phase 94: PH HMO Workflow Automation
 *
 * REST endpoints for remittance/EOB intake:
 *   POST  /rcm/remittance               -- upload remittance doc
 *   GET   /rcm/remittance               -- list remittance docs
 *   GET   /rcm/remittance/stats         -- remittance stats
 *   GET   /rcm/remittance/:id           -- single doc detail
 *   POST  /rcm/remittance/:id/tag       -- tag with line items
 *   POST  /rcm/remittance/:id/review    -- review + underpayment check
 *   POST  /rcm/remittance/:id/post      -- mark as posted to VistA AR
 *
 * Auth: session-level (matched by /rcm/ catch-all in AUTH_RULES).
 *
 * NOTE: Actual file upload is NOT handled here -- the client uploads
 * to a secure blob store and passes storageRef. This route handles
 * metadata only. No PHI in logs.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  createRemittanceDocument,
  getRemittanceDocumentForTenant,
  listRemittanceDocuments,
  getRemittanceStats,
  tagRemittanceDocument,
  reviewRemittanceDocument,
  markAsPosted,
} from '../workflows/remittance-intake.js';
import type { RemittanceDocType, RemittanceStatus } from '../workflows/remittance-intake.js';
import { safeErr } from '../../lib/safe-error.js';

function resolveTenantId(request: any): string {
  const requestTenantId = request?.tenantId || request?.session?.tenantId;
  if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
    return requestTenantId.trim();
  }
  const headerTenantId = request?.headers?.['x-tenant-id'];
  if (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) {
    return headerTenantId.trim();
  }
  return 'default';
}

function resolveActor(request: any, explicitActor?: string): string {
  return explicitActor || request?.session?.userName || request?.session?.duz || 'system';
}

const remittanceRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /* -- POST /rcm/remittance -- upload metadata -------------- */
  server.post('/rcm/remittance', async (request, reply) => {
    const body = (request.body as any) || {};
    const {
      payerId,
      payerName,
      docType = 'eob',
      filename,
      mimeType = 'application/pdf',
      sizeBytes = 0,
      storageRef,
      uploadedBy,
    } = body;

    if (!payerId || !filename || !storageRef) {
      return reply.status(400).send({
        ok: false,
        error: 'payerId, filename, and storageRef required',
      });
    }

    const doc = createRemittanceDocument({
      tenantId: resolveTenantId(request),
      payerId,
      payerName,
      docType: docType as RemittanceDocType,
      filename,
      mimeType,
      sizeBytes,
      storageRef,
      uploadedBy: resolveActor(request, uploadedBy),
    });

    return reply.status(201).send({ ok: true, document: doc });
  });

  /* -- GET /rcm/remittance -- list -------------------------- */
  server.get('/rcm/remittance', async (request, reply) => {
    const query = request.query as {
      status?: string;
      payerId?: string;
      limit?: string;
      offset?: string;
    };

    const result = listRemittanceDocuments(resolveTenantId(request), {
      status: query.status as RemittanceStatus | undefined,
      payerId: query.payerId,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    return reply.send({ ok: true, ...result });
  });

  /* -- GET /rcm/remittance/stats --------------------------- */
  server.get('/rcm/remittance/stats', async (request, reply) => {
    const stats = getRemittanceStats(resolveTenantId(request));
    return reply.send({ ok: true, ...stats });
  });

  /* -- GET /rcm/remittance/:id -- detail -------------------- */
  server.get('/rcm/remittance/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const doc = getRemittanceDocumentForTenant(resolveTenantId(request), id);
    if (!doc) return reply.status(404).send({ ok: false, error: 'Remittance document not found' });
    return reply.send({ ok: true, document: doc });
  });

  /* -- POST /rcm/remittance/:id/tag -- tag + associate ------ */
  server.post('/rcm/remittance/:id/tag', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { checkNumber, checkDate, lineItems, actor } = body;

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return reply.status(400).send({
        ok: false,
        error: 'lineItems array required (non-empty)',
      });
    }

    try {
      const doc = tagRemittanceDocument(resolveTenantId(request), id, {
        checkNumber,
        checkDate,
        lineItems,
        actor: resolveActor(request, actor),
      });
      return reply.send({ ok: true, document: doc });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: safeErr(err),
      });
    }
  });

  /* -- POST /rcm/remittance/:id/review -- review + flag ---- */
  server.post('/rcm/remittance/:id/review', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { actor } = body;

    try {
      const doc = reviewRemittanceDocument(resolveTenantId(request), id, resolveActor(request, actor));
      return reply.send({
        ok: true,
        document: doc,
        underpaymentFlagged: doc.underpaymentFlagged,
        underpaymentAmount: doc.underpaymentAmount,
      });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: safeErr(err),
      });
    }
  });

  /* -- POST /rcm/remittance/:id/post -- mark as posted ------ */
  server.post('/rcm/remittance/:id/post', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { vistaArIen, postingNotes = '', actor } = body;

    try {
      const doc = markAsPosted(
        resolveTenantId(request),
        id,
        vistaArIen,
        postingNotes,
        resolveActor(request, actor)
      );
      return reply.send({
        ok: true,
        document: doc,
        postingOutcome: vistaArIen ? 'posted_to_vista' : 'recorded_locally_pending_vista',
        vistaIntegration: vistaArIen
          ? 'Posted to VistA AR.'
          : 'Recorded locally only; VistA AR ^PRCA(430) filing is still pending in the sandbox.',
      });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: safeErr(err),
      });
    }
  });
};

export default remittanceRoutes;
