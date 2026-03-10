/**
 * Clearinghouse Transport Routes
 *
 * Phase 322 (W14-P6): REST endpoints for transport management, connection
 * testing, credential vault, rate limiting, and transport profiles.
 *
 * Routes:
 *   GET    /clearinghouse/transports             -- list transport providers
 *   POST   /clearinghouse/transports/test/:id    -- test connection for a transport
 *   POST   /clearinghouse/profiles               -- create transport profile
 *   GET    /clearinghouse/profiles               -- list transport profiles
 *   GET    /clearinghouse/profiles/:id           -- get one profile
 *   DELETE /clearinghouse/profiles/:id           -- delete profile
 *   GET    /clearinghouse/vault/status           -- vault health + key list
 *   POST   /clearinghouse/vault/credentials      -- store a credential
 *   DELETE /clearinghouse/vault/credentials/:key -- remove a credential
 *   GET    /clearinghouse/rate-limits            -- rate limit dashboard
 *   POST   /clearinghouse/rate-limits            -- configure rate limit
 *   GET    /clearinghouse/rate-limits/:id        -- specific connector rate limit
 *   GET    /clearinghouse/health                 -- transport layer health
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  listTransports,
  getTransport,
  createTransportProfile,
  listTransportProfiles,
  getTransportProfile,
  deleteTransportProfile,
  getActiveVault,
  listVaultProviders,
  configureRateLimit,
  listRateLimits,
  getRateLimitStatus,
} from '../rcm/connectors/clearinghouse-transport.js';

export async function clearinghouseTransportRoutes(app: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any, session: any): string | null {
    const sessionTenantId =
      typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
        ? session.tenantId.trim()
        : undefined;
    const requestTenantId =
      typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
        ? request.tenantId.trim()
        : undefined;
    const headerTenantId = request?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return sessionTenantId || requestTenantId || headerTenant || null;
  }

  function requireTenantId(request: any, reply: any, session: any): string | null {
    const tenantId = resolveTenantId(request, session);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function vaultKeyForTenant(tenantId: string, key: string): string {
    return `${tenantId}::${key}`;
  }

  // --- Transport Providers -----------------------------------------

  app.get('/clearinghouse/transports', async () => {
    const transports = listTransports();
    return { ok: true, count: transports.length, transports };
  });

  app.post('/clearinghouse/transports/test/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const transport = getTransport(id);
    if (!transport) {
      reply.code(404);
      return { ok: false, error: 'transport_not_found' };
    }

    // Optionally configure before testing
    if (body.config) {
      try {
        transport.configure(body.config);
      } catch (_err: any) {
        reply.code(400);
        return { ok: false, error: 'config_error' };
      }
    }

    const result = await transport.testConnection();
    return { ok: result.connected, result };
  });

  // --- Transport Profiles ------------------------------------------

  app.post('/clearinghouse/profiles', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.connectorId || !body.transportConfig) {
      reply.code(400);
      return { ok: false, error: 'connectorId and transportConfig are required' };
    }

    const profile = createTransportProfile({
      tenantId,
      connectorId: body.connectorId,
      transportConfig: body.transportConfig,
      rateLimitConfig: body.rateLimitConfig,
      vaultProviderId: body.vaultProviderId,
      enabled: body.enabled !== false,
    });

    reply.code(201);
    return { ok: true, profile };
  });

  app.get('/clearinghouse/profiles', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const profiles = listTransportProfiles(tenantId);
    return { ok: true, count: profiles.length, profiles };
  });

  app.get('/clearinghouse/profiles/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const profile = getTransportProfile(id, tenantId);
    if (!profile) {
      reply.code(404);
      return { ok: false, error: 'profile_not_found' };
    }
    return { ok: true, profile };
  });

  app.delete('/clearinghouse/profiles/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const deleted = deleteTransportProfile(id, tenantId);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: 'profile_not_found' };
    }
    return { ok: true, deleted: true };
  });

  // --- Credential Vault -------------------------------------------

  app.get('/clearinghouse/vault/status', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const vault = getActiveVault();
    const health = await vault.healthCheck();
    const keys = await vault.listKeys();
    const providers = listVaultProviders();
    return {
      ok: health.healthy,
      activeVault: { id: vault.id, name: vault.name },
      providers,
      health,
      credentialCount: keys.filter((key) => key.startsWith(`${tenantId}::`)).length,
      // Don't expose actual key names -- just count
    };
  });

  app.post('/clearinghouse/vault/credentials', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.key || !body.value || !body.type) {
      reply.code(400);
      return { ok: false, error: 'key, value, and type are required' };
    }

    const vault = getActiveVault();
    try {
      await vault.setCredential({
        key: vaultKeyForTenant(tenantId, body.key),
        value: body.value,
        type: body.type,
        metadata: { ...(body.metadata || {}), tenantId },
      });
    } catch (_err: any) {
      reply.code(422);
      return { ok: false, error: 'vault_write_failed' };
    }

    reply.code(201);
    return { ok: true, stored: true, key: body.key };
  });

  app.delete('/clearinghouse/vault/credentials/:key', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { key } = request.params as { key: string };
    const vault = getActiveVault();
    const deleted = await vault.deleteCredential(vaultKeyForTenant(tenantId, key));
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: 'credential_not_found' };
    }
    return { ok: true, deleted: true };
  });

  // --- Rate Limiting ----------------------------------------------

  app.get('/clearinghouse/rate-limits', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const limits = listRateLimits(tenantId);
    return { ok: true, count: limits.length, rateLimits: limits };
  });

  app.post('/clearinghouse/rate-limits', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.connectorId || !body.maxTokens || !body.refillRatePerSec) {
      reply.code(400);
      return { ok: false, error: 'connectorId, maxTokens, and refillRatePerSec are required' };
    }

    configureRateLimit(tenantId, body.connectorId, body.maxTokens, body.refillRatePerSec);
    return { ok: true, configured: true, connectorId: body.connectorId };
  });

  app.get('/clearinghouse/rate-limits/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const status = getRateLimitStatus(tenantId, id);
    return { ok: true, connectorId: id, ...status };
  });

  // --- Health -----------------------------------------------------

  app.get('/clearinghouse/health', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const transports = listTransports();
    const profiles = listTransportProfiles(tenantId);
    const limits = listRateLimits(tenantId);
    const vault = getActiveVault();
    const vaultHealth = await vault.healthCheck();
    const keys = await vault.listKeys();

    return {
      ok: true,
      transports: transports.length,
      profiles: { total: profiles.length, enabled: profiles.filter((p) => p.enabled).length },
      rateLimits: limits.length,
      vault: {
        id: vault.id,
        healthy: vaultHealth.healthy,
        credentialCount: keys.filter((key) => key.startsWith(`${tenantId}::`)).length,
      },
    };
  });
}
