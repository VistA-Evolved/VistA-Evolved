import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getBillingProvider, getPlans } from './index.js';
import { log } from '../lib/logger.js';

async function billingRoutes(server: FastifyInstance): Promise<void> {
  server.get('/billing/plans', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, plans: getPlans() });
  });

  server.get('/billing/subscription', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    const billing = getBillingProvider();
    const sub = await billing.getSubscription(session.tenantId);
    return reply.send({ ok: true, subscription: sub, provider: billing.name });
  });

  server.post('/billing/subscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    const body = (req.body as Record<string, unknown>) ?? {};
    const planId = (body.planId as string) ?? 'starter';

    const billing = getBillingProvider();
    const sub = await billing.createSubscription(session.tenantId, planId);

    log.info('Subscription created', {
      tenantId: session.tenantId,
      planId,
      provider: billing.name,
    });

    return reply.send({ ok: true, subscription: sub });
  });

  server.post('/billing/cancel', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    const billing = getBillingProvider();
    const sub = await billing.cancelSubscription(session.tenantId);

    log.info('Subscription cancelled', {
      tenantId: session.tenantId,
      provider: billing.name,
    });

    return reply.send({ ok: true, subscription: sub });
  });

  server.get('/billing/invoices', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    const billing = getBillingProvider();
    const invoices = await billing.listInvoices(session.tenantId);
    return reply.send({ ok: true, invoices });
  });

  server.post('/billing/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const billing = getBillingProvider();

    try {
      const result = await billing.handleWebhook(req.body, signature);

      log.info('Billing webhook processed', {
        event: result.event,
        tenantId: result.tenantId,
        provider: billing.name,
      });

      return reply.send({ ok: true, event: result.event });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log.warn('Billing webhook failed', { error: msg });
      return reply.code(400).send({ ok: false, error: msg });
    }
  });

  server.get('/billing/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    const billing = getBillingProvider();
    return reply.send({
      ok: true,
      provider: billing.name,
      configured: billing.name !== 'mock' || process.env.BILLING_PROVIDER === 'mock',
    });
  });
}

export default billingRoutes;
