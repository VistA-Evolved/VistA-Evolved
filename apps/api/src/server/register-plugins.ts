/**
 * Server — Register Plugins
 *
 * Phase 173: Extracted from index.ts — registers all Fastify plugins,
 * middleware, content-type parsers, and module system initialization.
 * NO route registration — that lives in register-routes.ts.
 */

import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { registerSecurityMiddleware, corsOriginValidator } from '../middleware/security.js';
import { registerNoFakeSuccessHook } from '../middleware/no-fake-success.js';
import { initModuleRegistry } from '../modules/module-registry.js';
import { initCapabilityService } from '../modules/capability-service.js';
import { initAdapters } from '../adapters/adapter-loader.js';
import { initMarketplaceTenantConfig } from '../config/marketplace-tenant.js';
import { moduleGuardHook } from '../middleware/module-guard.js';
import { registerTenantHook } from '../platform/pg/tenant-middleware.js';

/**
 * Register all Fastify plugins, middleware, and module system.
 * Called once during server construction before routes.
 */
export async function registerPlugins(server: FastifyInstance): Promise<void> {
  // Core Fastify plugins
  server.register(cors, {
    origin: corsOriginValidator as any,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  server.register(cookie);
  server.register(websocket);

  // OpenAPI spec + Swagger UI (must register before routes)
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'VistA-Evolved API',
        description: 'EHR modernization platform bridging VistA/CPRS with modern web services',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
      tags: [
        { name: 'auth', description: 'Authentication & session management' },
        { name: 'vista', description: 'VistA RPC-backed clinical routes' },
        { name: 'cprs', description: 'CPRS clinical panels (orders, notes, meds)' },
        { name: 'imaging', description: 'DICOMweb proxy, imaging worklist, devices' },
        { name: 'rcm', description: 'Revenue Cycle Management (claims, payers, EDI)' },
        { name: 'scheduling', description: 'Appointment scheduling (SDES/SDOE)' },
        { name: 'telehealth', description: 'Telehealth rooms & device checks' },
        { name: 'analytics', description: 'Analytics events & aggregation' },
        { name: 'admin', description: 'Admin, tenant, module management' },
        { name: 'portal', description: 'Patient portal' },
        { name: 'iam', description: 'Identity, OIDC, SCIM, policy, audit' },
        { name: 'posture', description: 'Production posture & observability' },
        { name: 'infrastructure', description: 'Health, ready, metrics, capabilities' },
      ],
    },
  });
  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Phase 15: Security middleware (request IDs, headers, rate limiting, error handler)
  await registerSecurityMiddleware(server);

  // Phase 72: No-fake-success tripwire (before routes, after security)
  registerNoFakeSuccessHook(server);

  // Phase 37C: Module registry + capability service + adapters + guard
  initModuleRegistry();
  initCapabilityService();
  await initAdapters();

  // Phase 51: Marketplace tenant config (after module registry)
  initMarketplaceTenantConfig();
  registerTenantHook(server);
  server.addHook('onRequest', moduleGuardHook);

  // Accept empty-body POSTs with any Content-Type (e.g., logout)
  server.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req: any, body: string, done: (err: null, result?: unknown) => void) => {
      try {
        done(null, body ? JSON.parse(body) : {});
      } catch {
        done(null, {});
      }
    }
  );

  // Override default JSON parser to tolerate empty body
  server.removeContentTypeParser('application/json');
  server.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req: any, body: string, done: (err: null, result?: unknown) => void) => {
      if (!body || body.trim() === '') {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body));
      } catch {
        done(null, {});
      }
    }
  );
}
