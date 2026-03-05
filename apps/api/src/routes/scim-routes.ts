/**
 * SCIM 2.0 Routes — Phase 339 (W16-P3).
 *
 * Exposes SCIM 2.0 (RFC 7643/7644) endpoints for automated user and
 * group provisioning from external IdPs.
 *
 * Auth: Bearer token validated against SCIM_BEARER_TOKEN env var.
 * Feature gate: SCIM_ENABLED=true required, else 501 on all endpoints.
 *
 * Routes:
 *   GET    /scim/v2/ServiceProviderConfig
 *   GET    /scim/v2/Schemas
 *   GET    /scim/v2/ResourceTypes
 *   POST   /scim/v2/Users
 *   GET    /scim/v2/Users/:id
 *   GET    /scim/v2/Users
 *   PUT    /scim/v2/Users/:id
 *   PATCH  /scim/v2/Users/:id
 *   DELETE /scim/v2/Users/:id
 *   POST   /scim/v2/Groups
 *   GET    /scim/v2/Groups/:id
 *   GET    /scim/v2/Groups
 *   PATCH  /scim/v2/Groups/:id
 *   DELETE /scim/v2/Groups/:id
 */

import type { FastifyInstance } from 'fastify';
import {
  getScimConnector,
  SCIM_ENABLED,
  SCIM_BEARER_TOKEN,
  type ScimGroup,
} from '../auth/scim-server.js';
import type { ScimUser, ScimPatchOp, ScimError } from '../auth/scim-connector.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function scimError(status: number, detail: string, scimType?: string): ScimError {
  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    detail,
    status: String(status),
    scimType,
  };
}

/**
 * Validate SCIM bearer token from Authorization header.
 * Returns the tenant ID from the X-Tenant-Id header, or "default".
 */
function validateScimAuth(request: any, reply: any): string | null {
  if (!SCIM_ENABLED) {
    reply.code(501).send(scimError(501, 'SCIM provisioning is not enabled'));
    return null;
  }

  if (!SCIM_BEARER_TOKEN) {
    reply.code(503).send(scimError(503, 'SCIM bearer token not configured'));
    return null;
  }

  const auth = request.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    reply.code(401).send(scimError(401, 'Bearer token required', 'invalidValue'));
    return null;
  }

  const token = auth.slice(7);

  // Constant-time comparison
  if (token.length !== SCIM_BEARER_TOKEN.length) {
    reply.code(401).send(scimError(401, 'Invalid bearer token', 'invalidValue'));
    return null;
  }

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ SCIM_BEARER_TOKEN.charCodeAt(i);
  }
  if (mismatch !== 0) {
    reply.code(401).send(scimError(401, 'Invalid bearer token', 'invalidValue'));
    return null;
  }

  // Tenant from header, defaulting to "default"
  return (request.headers['x-tenant-id'] as string) || 'default';
}

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

export default async function scimRoutes(server: FastifyInstance): Promise<void> {
  const connector = getScimConnector();

  /**
   * GET /scim/v2/ServiceProviderConfig
   */
  server.get('/scim/v2/ServiceProviderConfig', async (_request, reply) => {
    if (!SCIM_ENABLED) {
      return reply.code(501).send(scimError(501, 'SCIM provisioning is not enabled'));
    }
    return connector.getServiceProviderConfig();
  });

  /**
   * GET /scim/v2/Schemas
   */
  server.get('/scim/v2/Schemas', async (_request, reply) => {
    if (!SCIM_ENABLED) {
      return reply.code(501).send(scimError(501, 'SCIM provisioning is not enabled'));
    }
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:User',
          name: 'User',
          description: 'User Account',
        },
        {
          id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
          name: 'Group',
          description: 'Group',
        },
      ],
    };
  });

  /**
   * GET /scim/v2/ResourceTypes
   */
  server.get('/scim/v2/ResourceTypes', async (_request, reply) => {
    if (!SCIM_ENABLED) {
      return reply.code(501).send(scimError(501, 'SCIM provisioning is not enabled'));
    }
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'User',
          name: 'User',
          endpoint: '/scim/v2/Users',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
        },
        {
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
          id: 'Group',
          name: 'Group',
          endpoint: '/scim/v2/Groups',
          schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        },
      ],
    };
  });

  /* ---------------------------------------------------------------- */
  /* User endpoints                                                    */
  /* ---------------------------------------------------------------- */

  /**
   * POST /scim/v2/Users — Create user
   */
  server.post('/scim/v2/Users', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    try {
      const body = (request.body as ScimUser) || {};
      if (!body.userName) {
        return reply.code(400).send(scimError(400, 'userName is required', 'invalidValue'));
      }
      const user = await connector.createUser(body, tenantId);
      return reply.code(201).send(user);
    } catch (err: any) {
      log.warn('SCIM createUser failed', { error: err.message });
      return reply.code(409).send(scimError(409, 'User already exists', 'uniqueness'));
    }
  });

  /**
   * GET /scim/v2/Users/:id — Read user
   */
  server.get('/scim/v2/Users/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    const user = await connector.getUser(id, tenantId);
    if (!user) {
      return reply.code(404).send(scimError(404, `User ${id} not found`));
    }
    return user;
  });

  /**
   * GET /scim/v2/Users — List/filter users
   */
  server.get('/scim/v2/Users', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const query = request.query as Record<string, string>;
    const list = await connector.listUsers(
      query.filter,
      query.startIndex ? Number(query.startIndex) : undefined,
      query.count ? Number(query.count) : undefined,
      tenantId
    );
    return list;
  });

  /**
   * PUT /scim/v2/Users/:id — Replace user
   */
  server.put('/scim/v2/Users/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    try {
      const body = (request.body as ScimUser) || {};
      const user = await connector.replaceUser(id, body, tenantId);
      return user;
    } catch (_err: any) {
      return reply.code(404).send(scimError(404, 'User not found'));
    }
  });

  /**
   * PATCH /scim/v2/Users/:id — Patch user
   */
  server.patch('/scim/v2/Users/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    try {
      const body = (request.body as ScimPatchOp) || { schemas: [], Operations: [] };
      const user = await connector.patchUser(id, body, tenantId);
      return user;
    } catch (_err: any) {
      return reply.code(404).send(scimError(404, 'User not found'));
    }
  });

  /**
   * DELETE /scim/v2/Users/:id — Deactivate user
   */
  server.delete('/scim/v2/Users/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    try {
      await connector.deactivateUser(id, tenantId);
      return reply.code(204).send();
    } catch (_err: any) {
      return reply.code(404).send(scimError(404, 'User not found'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* Group endpoints                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * POST /scim/v2/Groups — Create group
   */
  server.post('/scim/v2/Groups', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    try {
      const body = (request.body as ScimGroup) || {};
      if (!body.displayName) {
        return reply.code(400).send(scimError(400, 'displayName is required', 'invalidValue'));
      }
      const group = await connector.createGroup(body, tenantId);
      return reply.code(201).send(group);
    } catch (_err: any) {
      return reply.code(409).send(scimError(409, 'Group already exists', 'uniqueness'));
    }
  });

  /**
   * GET /scim/v2/Groups/:id — Read group
   */
  server.get('/scim/v2/Groups/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    const group = await connector.getGroup(id, tenantId);
    if (!group) {
      return reply.code(404).send(scimError(404, `Group ${id} not found`));
    }
    return group;
  });

  /**
   * GET /scim/v2/Groups — List groups
   */
  server.get('/scim/v2/Groups', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    return connector.listGroups(tenantId);
  });

  /**
   * PATCH /scim/v2/Groups/:id — Patch group (add/remove members)
   */
  server.patch('/scim/v2/Groups/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    try {
      const body = (request.body as ScimPatchOp) || { schemas: [], Operations: [] };
      const group = await connector.patchGroup(id, body, tenantId);
      return group;
    } catch (_err: any) {
      return reply.code(404).send(scimError(404, 'Group not found'));
    }
  });

  /**
   * DELETE /scim/v2/Groups/:id — Delete group
   */
  server.delete('/scim/v2/Groups/:id', async (request, reply) => {
    const tenantId = validateScimAuth(request, reply);
    if (!tenantId) return reply;

    const { id } = request.params as { id: string };
    try {
      await connector.deleteGroup(id, tenantId);
      return reply.code(204).send();
    } catch (_err: any) {
      return reply.code(404).send(scimError(404, 'Group not found'));
    }
  });
}
