/**
 * Billing Gate Middleware -- enforces subscription-based access control.
 *
 * Phase D (SaaS Billing Wiring)
 *
 * Checks the tenant's subscription status before allowing access to
 * premium/paid features. Free routes (login, billing, signup, health)
 * bypass this check.
 *
 * Subscription states:
 *   - trialing / active -> full access
 *   - past_due -> read-only access (writes blocked)
 *   - suspended / cancelled -> no access (must resubscribe)
 *   - no subscription -> trial/demo access (grace period)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSubscriptionByTenant } from '../billing/billing-repo.js';
import { log } from '../lib/logger.js';

// Routes that bypass billing gating entirely
const BILLING_BYPASS_PATTERNS = [
  /^\/auth\//,
  /^\/billing\//,
  /^\/signup\//,
  /^\/health$/,
  /^\/ready$/,
  /^\/vista\/ping$/,
  /^\/vista\/swap-boundary$/,
  /^\/posture\//,
  /^\/metrics/,
  /^\/admin\/provisioning\//,
];

// Routes that are read-only (allowed during past_due)
const READ_ONLY_PATTERNS = [
  /^\/vista\/(?!.*(?:save|create|update|delete|sign|dc|hold|flag))/,
  /^\/cprs\/.*\/(?:list|read|get|search|context)/,
  /^\/billing\//,
  /^\/portal\/.*\/(?:dashboard|appointments|messages|records)/,
];

export type BillingAccessLevel = 'full' | 'read_only' | 'blocked' | 'bypass';

/**
 * Determine billing access level for a request.
 * Returns 'bypass' for routes exempt from billing checks.
 */
export async function checkBillingAccess(
  tenantId: string | undefined,
  routePath: string,
): Promise<{ level: BillingAccessLevel; reason?: string; subscriptionStatus?: string }> {
  // Bypass check for exempt routes
  if (BILLING_BYPASS_PATTERNS.some(p => p.test(routePath))) {
    return { level: 'bypass' };
  }

  // No tenant context -> bypass (pre-auth routes or internal)
  if (!tenantId) {
    return { level: 'bypass' };
  }

  // Check subscription from DB
  const sub = await getSubscriptionByTenant(tenantId);

  if (!sub) {
    // No subscription yet -- grace period (allow access during initial setup)
    // In production, this would enforce trial signup after a grace period
    const gracePeriodEnabled = process.env.BILLING_GRACE_PERIOD !== 'false';
    if (gracePeriodEnabled) {
      return { level: 'full', reason: 'grace_period', subscriptionStatus: 'none' };
    }
    return { level: 'blocked', reason: 'no_subscription', subscriptionStatus: 'none' };
  }

  switch (sub.status) {
    case 'trialing':
    case 'active':
      return { level: 'full', subscriptionStatus: sub.status };

    case 'past_due': {
      const isReadOnly = READ_ONLY_PATTERNS.some(p => p.test(routePath));
      if (isReadOnly) {
        return { level: 'read_only', reason: 'past_due_read_only', subscriptionStatus: 'past_due' };
      }
      return { level: 'read_only', reason: 'past_due_writes_blocked', subscriptionStatus: 'past_due' };
    }

    case 'suspended':
      return { level: 'blocked', reason: 'subscription_suspended', subscriptionStatus: 'suspended' };

    case 'cancelled':
      return { level: 'blocked', reason: 'subscription_cancelled', subscriptionStatus: 'cancelled' };

    default:
      return { level: 'full', subscriptionStatus: sub.status };
  }
}

/**
 * Fastify onRequest hook for billing enforcement.
 *
 * Install via: server.addHook('onRequest', billingGateHook)
 *
 * Disabled when BILLING_GATE_ENABLED is not 'true' (default: disabled).
 * This allows gradual rollout -- enable once billing is wired to Stripe.
 */
export async function billingGateHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Feature flag: disabled by default to avoid blocking existing deployments
  if (process.env.BILLING_GATE_ENABLED !== 'true') return;

  // Skip if already rejected by auth
  if ((request as any)._rejected || reply.sent) return;

  const session = (request as any).session as { tenantId?: string } | undefined;
  const routePath = request.routeOptions?.url || request.url;

  const { level, reason, subscriptionStatus } = await checkBillingAccess(
    session?.tenantId,
    routePath,
  );

  if (level === 'bypass' || level === 'full') return;

  if (level === 'read_only') {
    // Allow GETs, block mutations
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return;
    }
    log.info('Billing gate: write blocked (past due)', {
      tenantId: session?.tenantId,
      route: routePath,
      subscriptionStatus,
    });
    (request as any)._rejected = true;
    return reply.code(402).send({
      ok: false,
      error: 'Payment required. Your subscription is past due -- only read access is available.',
      subscriptionStatus,
      action: 'update_payment',
    });
  }

  if (level === 'blocked') {
    log.info('Billing gate: access blocked', {
      tenantId: session?.tenantId,
      route: routePath,
      reason,
      subscriptionStatus,
    });
    (request as any)._rejected = true;
    return reply.code(402).send({
      ok: false,
      error: 'Subscription required. Please subscribe to access this feature.',
      subscriptionStatus,
      reason,
      action: 'subscribe',
    });
  }
}
