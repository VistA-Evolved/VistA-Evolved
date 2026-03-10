/**
 * Terminology Routes -- Phase 313
 *
 * Endpoints for terminology resolution and validation.
 */

import type { FastifyInstance } from 'fastify';
import {
  listResolvers,
  getResolver,
  resolveCode,
  type TermDomain,
  US_TERMINOLOGY_DEFAULTS,
  PH_TERMINOLOGY_DEFAULTS,
  GH_TERMINOLOGY_DEFAULTS,
} from '../services/terminology-registry.js';

const TERM_DEFAULTS: Record<string, typeof US_TERMINOLOGY_DEFAULTS> = {
  US: US_TERMINOLOGY_DEFAULTS,
  PH: PH_TERMINOLOGY_DEFAULTS,
  GH: GH_TERMINOLOGY_DEFAULTS,
};

export async function terminologyRoutes(app: FastifyInstance): Promise<void> {
  // GET /terminology/resolvers -- list all registered resolvers
  app.get('/terminology/resolvers', async () => {
    return { ok: true, resolvers: listResolvers() };
  });

  // GET /terminology/defaults/:country -- get terminology defaults for a country
  app.get('/terminology/defaults/:country', async (request, reply) => {
    const { country } = request.params as { country: string };
    const defaults = TERM_DEFAULTS[country.toUpperCase()];
    if (!defaults) {
      return reply.code(404).send({
        ok: false,
        error: `No terminology defaults for country "${country}"`,
        available: Object.keys(TERM_DEFAULTS),
      });
    }
    return { ok: true, country: country.toUpperCase(), defaults };
  });

  // POST /terminology/resolve -- resolve a VistA code to standard code
  app.post('/terminology/resolve', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { domain, codeSystem, vistaCode, vistaFile } = body as {
      domain: string;
      codeSystem: string;
      vistaCode: string;
      vistaFile?: number;
    };

    if (!domain || !codeSystem || !vistaCode) {
      return reply.code(400).send({
        ok: false,
        error: 'domain, codeSystem, vistaCode required',
      });
    }

    const result = resolveCode(domain as TermDomain, codeSystem, vistaCode, vistaFile);

    return { ok: true, resolved: result };
  });

  // POST /terminology/validate -- validate a code against a code system
  app.post('/terminology/validate', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { domain, codeSystem, code } = body as {
      domain: string;
      codeSystem: string;
      code: string;
    };

    if (!domain || !codeSystem || !code) {
      return reply.code(400).send({
        ok: false,
        error: 'domain, codeSystem, code required',
      });
    }

    const resolver = getResolver(domain as TermDomain, codeSystem);
    if (!resolver) {
      return { ok: true, valid: true, note: 'No resolver registered; assuming valid' };
    }

    return { ok: true, valid: resolver.validate(code), resolver: resolver.id };
  });
}
