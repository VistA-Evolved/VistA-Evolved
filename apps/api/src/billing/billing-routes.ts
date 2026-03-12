import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getBillingProvider, getPlans } from './index.js';
import { log } from '../lib/logger.js';
import { getMeterSnapshot } from './metering.js';
import {
  upsertCustomer,
  upsertSubscription,
  getSubscriptionByTenant,
  updateSubscriptionStatus,
  getSubscriptionByExternalId,
  upsertInvoice,
  listInvoicesByTenant,
} from './billing-repo.js';

async function billingRoutes(server: FastifyInstance): Promise<void> {
  server.get('/billing/plans', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, plans: getPlans() });
  });

  server.get('/billing/subscription', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    // Try DB first, then fall back to provider
    const dbSub = await getSubscriptionByTenant(session.tenantId);
    if (dbSub) {
      return reply.send({
        ok: true,
        subscription: {
          id: dbSub.id,
          tenantId: dbSub.tenantId,
          planId: dbSub.planId,
          status: dbSub.status,
          currentPeriodStart: dbSub.currentPeriodStart,
          currentPeriodEnd: dbSub.currentPeriodEnd,
          trialEnd: dbSub.trialEnd,
          cancelledAt: dbSub.cancelledAt,
          externalId: dbSub.externalSubscriptionId,
          createdAt: dbSub.createdAt,
          updatedAt: dbSub.updatedAt,
        },
        provider: dbSub.provider,
        source: 'db',
      });
    }

    const billing = getBillingProvider();
    const sub = await billing.getSubscription(session.tenantId);
    return reply.send({ ok: true, subscription: sub, provider: billing.name, source: 'provider' });
  });

  server.get('/billing/usage', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    const billing = getBillingProvider();
    return reply.send({
      ok: true,
      tenantId: session.tenantId,
      counters: getMeterSnapshot(session.tenantId),
      source: 'metering-snapshot',
      durable: false,
      provider: billing.name,
      note: 'Meter counters are in-memory snapshots for the authenticated tenant and reset on API restart.',
    });
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

    // Persist to DB
    const customer = await upsertCustomer(
      session.tenantId,
      billing.name,
      sub.externalId,
      session.email,
    );
    await upsertSubscription(session.tenantId, customer.id, sub, billing.name);

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

    // Update DB
    await updateSubscriptionStatus(session.tenantId, 'cancelled', sub.cancelledAt);

    log.info('Subscription cancelled', {
      tenantId: session.tenantId,
      provider: billing.name,
    });

    return reply.send({ ok: true, subscription: sub });
  });

  server.post('/billing/update', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    const body = (req.body as Record<string, unknown>) ?? {};
    const newPlanId = body.planId as string;
    if (!newPlanId) {
      return reply.code(400).send({ ok: false, error: 'planId is required' });
    }

    const billing = getBillingProvider();
    const sub = await billing.updateSubscription(session.tenantId, newPlanId);

    // Re-persist to DB
    const existingSub = await getSubscriptionByTenant(session.tenantId);
    if (existingSub) {
      await upsertSubscription(session.tenantId, existingSub.customerId, sub, billing.name);
    }

    log.info('Subscription updated', {
      tenantId: session.tenantId,
      newPlanId,
      provider: billing.name,
    });

    return reply.send({ ok: true, subscription: sub });
  });

  server.get('/billing/invoices', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = (req as any).session;
    if (!session?.tenantId) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }

    // Try DB first
    const dbInvoices = await listInvoicesByTenant(session.tenantId);
    if (dbInvoices.length > 0) {
      return reply.send({ ok: true, invoices: dbInvoices, source: 'db' });
    }

    const billing = getBillingProvider();
    const invoices = await billing.listInvoices(session.tenantId);
    return reply.send({ ok: true, invoices, source: 'provider' });
  });

  server.post('/billing/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const billing = getBillingProvider();

    try {
      const result = await billing.handleWebhook(req.body, signature);

      // Process webhook events and update local state
      const eventType = result.event;
      const body = req.body as Record<string, unknown>;
      const dataObj = (body.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

      if (eventType.startsWith('customer.subscription.') && dataObj) {
        const externalSubId = dataObj.id as string;
        const stripeStatus = dataObj.status as string;
        const dbSub = await getSubscriptionByExternalId(externalSubId);

        if (dbSub) {
          const statusMap: Record<string, string> = {
            trialing: 'trialing', active: 'active', past_due: 'past_due',
            canceled: 'cancelled', unpaid: 'suspended',
          };
          const newStatus = statusMap[stripeStatus] || stripeStatus;
          const cancelledAt = dataObj.canceled_at
            ? new Date((dataObj.canceled_at as number) * 1000).toISOString()
            : undefined;
          await updateSubscriptionStatus(dbSub.tenantId, newStatus, cancelledAt);
          log.info('Webhook: subscription status updated', {
            tenantId: dbSub.tenantId,
            externalSubId,
            newStatus,
          });
        }
      }

      if (eventType.startsWith('invoice.') && dataObj) {
        const externalSubId = dataObj.subscription as string;
        const dbSub = externalSubId ? await getSubscriptionByExternalId(externalSubId) : null;

        if (dbSub) {
          await upsertInvoice(dbSub.tenantId, dbSub.id, {
            id: dataObj.id as string,
            tenantId: dbSub.tenantId,
            subscriptionId: dbSub.id,
            amountCents: (dataObj.amount_due as number) ?? 0,
            currency: (dataObj.currency as string) ?? 'usd',
            status: dataObj.paid ? 'paid' : 'open',
            periodStart: new Date(((dataObj.period_start as number) ?? 0) * 1000).toISOString(),
            periodEnd: new Date(((dataObj.period_end as number) ?? 0) * 1000).toISOString(),
            paidAt: dataObj.status_transitions
              ? new Date(((dataObj.status_transitions as Record<string, number>).paid_at ?? 0) * 1000).toISOString()
              : undefined,
            externalUrl: dataObj.hosted_invoice_url as string | undefined,
          });
          log.info('Webhook: invoice recorded', {
            tenantId: dbSub.tenantId,
            invoiceId: dataObj.id,
            status: dataObj.paid ? 'paid' : 'open',
          });
        }
      }

      log.info('Billing webhook processed', {
        event: result.event,
        tenantId: result.tenantId,
        provider: billing.name,
      });

      return reply.send({ ok: true, event: result.event });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log.warn('Billing webhook failed', { error: msg });
      return reply.code(400).send({ ok: false, error: 'Webhook processing failed' });
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
