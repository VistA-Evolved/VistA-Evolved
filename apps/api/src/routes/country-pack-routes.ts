/**
 * country-pack-routes.ts — REST endpoints for country pack management.
 *
 * Phase 314 (W13-P6)
 *
 * Endpoints:
 *   GET  /country-packs                 — List all loaded packs
 *   GET  /country-packs/:cc             — Get a specific pack by ISO code
 *   GET  /country-packs/:cc/validate    — Validate a pack
 *   GET  /country-packs/:cc/resolve     — Resolve effective config for tenant
 *   GET  /country-packs/:cc/modules     — Get enabled modules for a pack
 *   GET  /country-packs/:cc/terminology — Get terminology defaults for a pack
 *   GET  /country-packs/:cc/regulatory  — Get regulatory profile for a pack
 */

import { FastifyInstance } from 'fastify';
import {
  listCountryPacks,
  getCountryPack,
  resolvePackForTenant,
  validatePack,
} from '../platform/country-pack-loader.js';

export async function countryPackRoutes(app: FastifyInstance): Promise<void> {
  // List all packs
  app.get('/country-packs', async (_request, _reply) => {
    const packs = listCountryPacks();
    return { ok: true, packs, count: packs.length };
  });

  // Get specific pack
  app.get('/country-packs/:cc', async (request, reply) => {
    const { cc } = request.params as { cc: string };
    const result = getCountryPack(cc);
    if (!result) {
      reply.code(404);
      return { ok: false, error: `No country pack found for ${cc.toUpperCase()}` };
    }
    return {
      ok: true,
      countryCode: result.pack.countryCode,
      countryName: result.pack.countryName,
      packVersion: result.pack.packVersion,
      status: result.pack.status,
      contentHash: result.contentHash,
      loadedAt: result.loadedAt,
      validationErrors: result.validationErrors,
      pack: result.pack,
    };
  });

  // Validate a pack
  app.get('/country-packs/:cc/validate', async (request, reply) => {
    const { cc } = request.params as { cc: string };
    const result = getCountryPack(cc);
    if (!result) {
      reply.code(404);
      return { ok: false, error: `No country pack found for ${cc.toUpperCase()}` };
    }
    const errors = validatePack(result.pack);
    return {
      ok: errors.length === 0,
      countryCode: result.pack.countryCode,
      errors,
      checkedAt: new Date().toISOString(),
    };
  });

  // Resolve effective config for tenant
  app.get('/country-packs/:cc/resolve', async (request, _reply) => {
    const { cc } = request.params as { cc: string };
    const resolved = resolvePackForTenant(cc);
    return resolved;
  });

  // Get enabled modules
  app.get('/country-packs/:cc/modules', async (request, reply) => {
    const { cc } = request.params as { cc: string };
    const result = getCountryPack(cc);
    if (!result) {
      reply.code(404);
      return { ok: false, error: `No country pack found for ${cc.toUpperCase()}` };
    }
    return {
      ok: true,
      countryCode: result.pack.countryCode,
      enabledModules: result.pack.enabledModules,
      featureFlags: result.pack.featureFlags,
    };
  });

  // Get terminology defaults
  app.get('/country-packs/:cc/terminology', async (request, reply) => {
    const { cc } = request.params as { cc: string };
    const result = getCountryPack(cc);
    if (!result) {
      reply.code(404);
      return { ok: false, error: `No country pack found for ${cc.toUpperCase()}` };
    }
    return {
      ok: true,
      countryCode: result.pack.countryCode,
      terminologyDefaults: result.pack.terminologyDefaults,
    };
  });

  // Get regulatory profile
  app.get('/country-packs/:cc/regulatory', async (request, reply) => {
    const { cc } = request.params as { cc: string };
    const result = getCountryPack(cc);
    if (!result) {
      reply.code(404);
      return { ok: false, error: `No country pack found for ${cc.toUpperCase()}` };
    }
    return {
      ok: true,
      countryCode: result.pack.countryCode,
      regulatoryProfile: result.pack.regulatoryProfile,
      dataResidency: result.pack.dataResidency,
      reportingRequirements: result.pack.reportingRequirements,
    };
  });
}
