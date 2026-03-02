/**
 * country-policy-hook.ts — Runtime Country Policy Spine
 *
 * Phase 493 (W34-P3)
 *
 * Fastify onRequest hook that resolves the effective CountryPackValues
 * for each authenticated request based on the tenant's countryPackId.
 *
 * Decorates request with `countryPolicy` for downstream use by:
 * - P4: Consent engine (consentGranularity, consentRequired)
 * - P5: Data residency (region locks, cross-border transfer)
 * - P6: Retention enforcement (min/max years, DSAR)
 * - P7: i18n (supportedLocales, defaultLocale)
 *
 * For unauthenticated routes, countryPolicy is null.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  resolveCountryPolicy,
  type CountryPackValues,
} from "../platform/country-pack-loader.js";
import { getTenant } from "../config/tenant-config.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CountryPolicyContext {
  /** Resolved country pack values, or null if no pack bound / unauthenticated */
  pack: CountryPackValues | null;
  /** The country pack ID from the tenant config */
  countryPackId: string;
  /** The tenant's configured locale */
  locale: string;
  /** The tenant's configured timezone */
  timezone: string;
}

/* ------------------------------------------------------------------ */
/* Fastify declaration merging                                         */
/* ------------------------------------------------------------------ */

declare module "fastify" {
  interface FastifyRequest {
    countryPolicy?: CountryPolicyContext;
  }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Register the country policy hook as a Fastify plugin.
 * Runs on every request after auth (as a normal route-level decorator).
 * Sets request.countryPolicy with the resolved pack.
 */
export async function countryPolicyHook(app: FastifyInstance): Promise<void> {
  app.decorateRequest("countryPolicy", undefined);

  app.addHook("onRequest", async (request: FastifyRequest, _reply: FastifyReply) => {
    // Skip if request was already rejected by auth gateway
    if ((request as any)._rejected || (request.raw as any)?.destroyed) return;

    // Resolve tenant from session
    const session = (request as any).session;
    const tenantId = session?.tenantId || "default";

    const tenant = getTenant(tenantId);
    if (!tenant) {
      // No tenant found — set null policy (will use system defaults)
      request.countryPolicy = {
        pack: null,
        countryPackId: "US",
        locale: "en",
        timezone: "America/New_York",
      };
      return;
    }

    const countryPackId = tenant.countryPackId || "US";
    const pack = resolveCountryPolicy(countryPackId);

    request.countryPolicy = {
      pack,
      countryPackId,
      locale: tenant.locale || pack?.defaultLocale || "en",
      timezone: tenant.timezone || pack?.defaultTimezone || "America/New_York",
    };
  });
}

/* ------------------------------------------------------------------ */
/* Utility: read policy from request (for use in route handlers)       */
/* ------------------------------------------------------------------ */

/**
 * Get the effective country policy from a request.
 * Returns a safe default if the hook hasn't run (e.g., unauthenticated).
 */
export function getEffectivePolicy(request: FastifyRequest): CountryPolicyContext {
  return (
    request.countryPolicy || {
      pack: null,
      countryPackId: "US",
      locale: "en",
      timezone: "America/New_York",
    }
  );
}
