/**
 * Clearinghouse Transport Routes
 *
 * Phase 322 (W14-P6): REST endpoints for transport management, connection
 * testing, credential vault, rate limiting, and transport profiles.
 *
 * Routes:
 *   GET    /clearinghouse/transports             — list transport providers
 *   POST   /clearinghouse/transports/test/:id    — test connection for a transport
 *   POST   /clearinghouse/profiles               — create transport profile
 *   GET    /clearinghouse/profiles               — list transport profiles
 *   GET    /clearinghouse/profiles/:id           — get one profile
 *   DELETE /clearinghouse/profiles/:id           — delete profile
 *   GET    /clearinghouse/vault/status           — vault health + key list
 *   POST   /clearinghouse/vault/credentials      — store a credential
 *   DELETE /clearinghouse/vault/credentials/:key — remove a credential
 *   GET    /clearinghouse/rate-limits            — rate limit dashboard
 *   POST   /clearinghouse/rate-limits            — configure rate limit
 *   GET    /clearinghouse/rate-limits/:id        — specific connector rate limit
 *   GET    /clearinghouse/health                 — transport layer health
 */

import type { FastifyInstance } from "fastify";
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
} from "../rcm/connectors/clearinghouse-transport.js";

export async function clearinghouseTransportRoutes(app: FastifyInstance): Promise<void> {

  // ─── Transport Providers ─────────────────────────────────────────

  app.get("/clearinghouse/transports", async () => {
    const transports = listTransports();
    return { ok: true, count: transports.length, transports };
  });

  app.post("/clearinghouse/transports/test/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const transport = getTransport(id);
    if (!transport) {
      reply.code(404);
      return { ok: false, error: "transport_not_found" };
    }

    // Optionally configure before testing
    if (body.config) {
      try {
        transport.configure(body.config);
      } catch (err: any) {
        reply.code(400);
        return { ok: false, error: `config_error: ${err.message}` };
      }
    }

    const result = await transport.testConnection();
    return { ok: result.connected, result };
  });

  // ─── Transport Profiles ──────────────────────────────────────────

  app.post("/clearinghouse/profiles", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.connectorId || !body.transportConfig) {
      reply.code(400);
      return { ok: false, error: "connectorId and transportConfig are required" };
    }

    const profile = createTransportProfile({
      connectorId: body.connectorId,
      transportConfig: body.transportConfig,
      rateLimitConfig: body.rateLimitConfig,
      vaultProviderId: body.vaultProviderId,
      enabled: body.enabled !== false,
    });

    reply.code(201);
    return { ok: true, profile };
  });

  app.get("/clearinghouse/profiles", async () => {
    const profiles = listTransportProfiles();
    return { ok: true, count: profiles.length, profiles };
  });

  app.get("/clearinghouse/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = getTransportProfile(id);
    if (!profile) {
      reply.code(404);
      return { ok: false, error: "profile_not_found" };
    }
    return { ok: true, profile };
  });

  app.delete("/clearinghouse/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteTransportProfile(id);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: "profile_not_found" };
    }
    return { ok: true, deleted: true };
  });

  // ─── Credential Vault ───────────────────────────────────────────

  app.get("/clearinghouse/vault/status", async () => {
    const vault = getActiveVault();
    const health = await vault.healthCheck();
    const keys = await vault.listKeys();
    const providers = listVaultProviders();
    return {
      ok: health.healthy,
      activeVault: { id: vault.id, name: vault.name },
      providers,
      health,
      credentialCount: keys.length,
      // Don't expose actual key names — just count
    };
  });

  app.post("/clearinghouse/vault/credentials", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.key || !body.value || !body.type) {
      reply.code(400);
      return { ok: false, error: "key, value, and type are required" };
    }

    const vault = getActiveVault();
    try {
      await vault.setCredential({
        key: body.key,
        value: body.value,
        type: body.type,
        metadata: body.metadata,
      });
    } catch (err: any) {
      reply.code(422);
      return { ok: false, error: err.message || "vault_write_failed" };
    }

    reply.code(201);
    return { ok: true, stored: true, key: body.key };
  });

  app.delete("/clearinghouse/vault/credentials/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const vault = getActiveVault();
    const deleted = await vault.deleteCredential(key);
    if (!deleted) {
      reply.code(404);
      return { ok: false, error: "credential_not_found" };
    }
    return { ok: true, deleted: true };
  });

  // ─── Rate Limiting ──────────────────────────────────────────────

  app.get("/clearinghouse/rate-limits", async () => {
    const limits = listRateLimits();
    return { ok: true, count: limits.length, rateLimits: limits };
  });

  app.post("/clearinghouse/rate-limits", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.connectorId || !body.maxTokens || !body.refillRatePerSec) {
      reply.code(400);
      return { ok: false, error: "connectorId, maxTokens, and refillRatePerSec are required" };
    }

    configureRateLimit(body.connectorId, body.maxTokens, body.refillRatePerSec);
    return { ok: true, configured: true, connectorId: body.connectorId };
  });

  app.get("/clearinghouse/rate-limits/:id", async (request) => {
    const { id } = request.params as { id: string };
    const status = getRateLimitStatus(id);
    return { ok: true, connectorId: id, ...status };
  });

  // ─── Health ─────────────────────────────────────────────────────

  app.get("/clearinghouse/health", async () => {
    const transports = listTransports();
    const profiles = listTransportProfiles();
    const limits = listRateLimits();
    const vault = getActiveVault();
    const vaultHealth = await vault.healthCheck();

    return {
      ok: true,
      transports: transports.length,
      profiles: { total: profiles.length, enabled: profiles.filter((p) => p.enabled).length },
      rateLimits: limits.length,
      vault: { id: vault.id, healthy: vaultHealth.healthy },
    };
  });
}
