/**
 * PhilHealth Transport Routes -- Phase 515 (Wave 37 B3)
 *
 * Thin REST layer over the PhilHealth transport client.
 * Endpoints for claim submission, status check, eligibility,
 * and attachment upload -- all in mock mode by default.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PhilHealthTransport } from './transport.js';

let transport: PhilHealthTransport | null = null;

function getTransport(): PhilHealthTransport {
  if (!transport) transport = new PhilHealthTransport();
  return transport;
}

export async function philhealthTransportRoutes(server: FastifyInstance): Promise<void> {
  /* Health check */
  server.get('/rcm/philhealth/transport/health', async () => {
    const t = getTransport();
    const health = await t.healthCheck();
    return { ok: health.ok, mode: health.mode, latencyMs: health.latencyMs };
  });

  /* Submit claim bundle */
  server.post(
    '/rcm/philhealth/transport/submit',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      if (!body.claimBundle) {
        return reply.code(400).send({ ok: false, error: 'claimBundle required' });
      }
      const t = getTransport();
      const result = await t.submitClaim(body.claimBundle);
      return { ok: result.success, ...result };
    }
  );

  /* Check claim status */
  server.get(
    '/rcm/philhealth/transport/status/:claimRefNo',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { claimRefNo } = request.params as { claimRefNo: string };
      const t = getTransport();
      const result = await t.checkClaimStatus(claimRefNo);
      return { ok: result.success, ...result };
    }
  );

  /* Check member eligibility */
  server.get(
    '/rcm/philhealth/transport/eligibility/:pin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pin } = request.params as { pin: string };
      const t = getTransport();
      const result = await t.checkEligibility(pin);
      return { ok: result.success, ...result };
    }
  );

  /* Upload attachment */
  server.post(
    '/rcm/philhealth/transport/attachments/:claimRefNo',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { claimRefNo } = request.params as { claimRefNo: string };
      const body = (request.body as any) || {};
      if (!body.filename || !body.content) {
        return reply.code(400).send({ ok: false, error: 'filename and content (base64) required' });
      }
      const t = getTransport();
      const buf = Buffer.from(body.content, 'base64');
      const result = await t.uploadAttachment(claimRefNo, body.filename, buf, body.contentType);
      return { ok: result.success, ...result };
    }
  );
}
