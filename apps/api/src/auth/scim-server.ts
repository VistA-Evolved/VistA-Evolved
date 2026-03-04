/**
 * In-Process SCIM Server — Phase 339 (W16-P3).
 *
 * Implements the ScimConnector interface with in-memory stores.
 * Provides SCIM 2.0 user and group lifecycle management.
 *
 * Feature-flagged via SCIM_ENABLED env var.
 * Bearer token auth via SCIM_BEARER_TOKEN env var.
 *
 * Design:
 *   - In-memory Maps for users + groups (DB-backed via PG migration v34)
 *   - externalId-based idempotency: duplicate create → return existing
 *   - Group membership maps to VistA roles via display name prefix
 *   - Tenant isolation on all operations
 *   - All changes audited via immutable audit trail
 */

import { randomUUID } from 'crypto';
import { log } from '../lib/logger.js';
import { immutableAudit, type ImmutableAuditAction } from '../lib/immutable-audit.js';
import type { UserRole } from './session-store.js';
import type {
  ScimConnector,
  ScimUser,
  ScimListResponse,
  ScimPatchOp,
  ScimServiceProviderConfig,
  ScimMeta,
} from './scim-connector.js';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export const SCIM_ENABLED = process.env.SCIM_ENABLED === 'true';
export const SCIM_BEARER_TOKEN = process.env.SCIM_BEARER_TOKEN || '';

/* ------------------------------------------------------------------ */
/* Group types (extends scim-connector.ts types)                      */
/* ------------------------------------------------------------------ */

export interface ScimGroup {
  schemas: string[];
  id?: string;
  externalId?: string;
  meta?: ScimMeta;
  displayName: string;
  members?: Array<{
    value: string; // user id
    display?: string;
    $ref?: string;
    type?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/* In-memory stores                                                    */
/* ------------------------------------------------------------------ */

const userStore = new Map<string, ScimUser & { _tenantId: string }>();
const groupStore = new Map<string, ScimGroup & { _tenantId: string }>();

/** Index: tenantId:externalId → userId for idempotency */
const externalIdIndex = new Map<string, string>();

function extIdKey(tenantId: string, externalId: string): string {
  return `${tenantId}:${externalId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeMeta(resourceType: string, id: string): ScimMeta {
  const now = nowIso();
  return {
    resourceType,
    created: now,
    lastModified: now,
    location: `/scim/v2/${resourceType}s/${id}`,
    version: `W/"${Date.now()}"`,
  };
}

/* ------------------------------------------------------------------ */
/* Role mapping from SCIM groups                                       */
/* ------------------------------------------------------------------ */

/**
 * Map SCIM group displayName to VistA role.
 * Convention: groups prefixed with "role:" map directly.
 * e.g., "role:admin" → "admin", "role:provider" → "provider"
 */
export function mapGroupToRole(groupDisplayName: string): UserRole | null {
  const lower = groupDisplayName.toLowerCase();
  if (lower.startsWith('role:')) {
    const roleName = lower.slice(5).trim();
    const validRoles: UserRole[] = [
      'provider',
      'nurse',
      'pharmacist',
      'clerk',
      'admin',
      'billing',
      'support',
    ];
    if (validRoles.includes(roleName as UserRole)) return roleName as UserRole;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* InProcessScimConnector                                              */
/* ------------------------------------------------------------------ */

export class InProcessScimConnector implements ScimConnector {
  getServiceProviderConfig(): ScimServiceProviderConfig {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri: 'https://github.com/VistA-Evolved/docs/scim',
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: true },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'Authentication using OAuth 2.0 Bearer Token (RFC 6750)',
        },
      ],
    };
  }

  async createUser(user: ScimUser, tenantId: string): Promise<ScimUser> {
    // Idempotency: check externalId
    if (user.externalId) {
      const existing = externalIdIndex.get(extIdKey(tenantId, user.externalId));
      if (existing) {
        const existingUser = userStore.get(existing);
        if (existingUser) {
          log.debug('SCIM createUser: externalId already exists, returning existing', {
            externalId: user.externalId,
          });
          return this.stripInternal(existingUser);
        }
      }
    }

    const id = randomUUID();
    const created: ScimUser & { _tenantId: string } = {
      ...user,
      id,
      schemas: user.schemas?.length
        ? user.schemas
        : [
            'urn:ietf:params:scim:schemas:core:2.0:User',
            'urn:ietf:params:scim:schemas:extension:vista:2.0:User',
          ],
      meta: makeMeta('User', id),
      active: user.active ?? true,
      _tenantId: tenantId,
    };

    userStore.set(id, created);
    if (user.externalId) {
      externalIdIndex.set(extIdKey(tenantId, user.externalId), id);
    }

    immutableAudit(
      'scim.user.created' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimUserId: id, userName: user.userName, tenantId } }
    );

    return this.stripInternal(created);
  }

  async getUser(id: string, tenantId: string): Promise<ScimUser | null> {
    const user = userStore.get(id);
    if (!user || user._tenantId !== tenantId) return null;
    return this.stripInternal(user);
  }

  async listUsers(
    filter?: string,
    startIndex?: number,
    count?: number,
    tenantId?: string
  ): Promise<ScimListResponse<ScimUser>> {
    let users = [...userStore.values()];
    if (tenantId) users = users.filter((u) => u._tenantId === tenantId);

    // Basic filter support: userName eq "value"
    if (filter) {
      const match = filter.match(/^(\w+)\s+eq\s+"([^"]+)"$/i);
      if (match) {
        const [, attr, val] = match;
        users = users.filter((u) => {
          if (attr === 'userName') return u.userName === val;
          if (attr === 'externalId') return u.externalId === val;
          if (attr === 'displayName') return u.displayName === val;
          return true;
        });
      }
    }

    const start = (startIndex ?? 1) - 1;
    const size = count ?? 100;
    const page = users.slice(start, start + size);

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: users.length,
      startIndex: start + 1,
      itemsPerPage: page.length,
      Resources: page.map((u) => this.stripInternal(u)),
    };
  }

  async replaceUser(id: string, user: ScimUser, tenantId: string): Promise<ScimUser> {
    const existing = userStore.get(id);
    if (!existing || existing._tenantId !== tenantId) {
      throw new Error(`User ${id} not found`);
    }

    const updated: ScimUser & { _tenantId: string } = {
      ...user,
      id,
      schemas: existing.schemas,
      meta: {
        ...existing.meta!,
        lastModified: nowIso(),
        version: `W/"${Date.now()}"`,
      },
      _tenantId: tenantId,
    };

    userStore.set(id, updated);

    // Update externalId index if changed
    if (existing.externalId && existing.externalId !== user.externalId) {
      externalIdIndex.delete(extIdKey(tenantId, existing.externalId));
    }
    if (user.externalId) {
      externalIdIndex.set(extIdKey(tenantId, user.externalId), id);
    }

    immutableAudit(
      'scim.user.replaced' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimUserId: id, tenantId } }
    );

    return this.stripInternal(updated);
  }

  async patchUser(id: string, patch: ScimPatchOp, tenantId: string): Promise<ScimUser> {
    const existing = userStore.get(id);
    if (!existing || existing._tenantId !== tenantId) {
      throw new Error(`User ${id} not found`);
    }

    const patched = { ...existing } as any;

    for (const op of patch.Operations) {
      if (op.op === 'replace' && op.path) {
        patched[op.path] = op.value;
      } else if (op.op === 'add' && op.path) {
        patched[op.path] = op.value;
      } else if (op.op === 'remove' && op.path) {
        delete patched[op.path];
      }
    }

    patched.meta = {
      ...existing.meta!,
      lastModified: nowIso(),
      version: `W/"${Date.now()}"`,
    };

    userStore.set(id, patched);

    immutableAudit(
      'scim.user.patched' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimUserId: id, tenantId, operations: patch.Operations.length } }
    );

    return this.stripInternal(patched);
  }

  async deactivateUser(id: string, tenantId: string): Promise<void> {
    const existing = userStore.get(id);
    if (!existing || existing._tenantId !== tenantId) {
      throw new Error(`User ${id} not found`);
    }

    existing.active = false;
    existing.meta = {
      ...existing.meta!,
      lastModified: nowIso(),
      version: `W/"${Date.now()}"`,
    };

    immutableAudit(
      'scim.user.deactivated' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimUserId: id, tenantId } }
    );
  }

  /* ---------------------------------------------------------------- */
  /* Group operations (not in base ScimConnector — extension)          */
  /* ---------------------------------------------------------------- */

  async createGroup(group: ScimGroup, tenantId: string): Promise<ScimGroup> {
    // Idempotency by externalId
    if (group.externalId) {
      for (const [, g] of groupStore) {
        if (g._tenantId === tenantId && g.externalId === group.externalId) {
          return this.stripGroupInternal(g);
        }
      }
    }

    const id = randomUUID();
    const created: ScimGroup & { _tenantId: string } = {
      ...group,
      id,
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      meta: makeMeta('Group', id),
      members: group.members ?? [],
      _tenantId: tenantId,
    };

    groupStore.set(id, created);

    immutableAudit(
      'scim.group.created' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimGroupId: id, displayName: group.displayName, tenantId } }
    );

    return this.stripGroupInternal(created);
  }

  async getGroup(id: string, tenantId: string): Promise<ScimGroup | null> {
    const group = groupStore.get(id);
    if (!group || group._tenantId !== tenantId) return null;
    return this.stripGroupInternal(group);
  }

  async listGroups(tenantId: string): Promise<ScimListResponse<ScimGroup>> {
    const groups = [...groupStore.values()].filter((g) => g._tenantId === tenantId);
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: groups.length,
      startIndex: 1,
      itemsPerPage: groups.length,
      Resources: groups.map((g) => this.stripGroupInternal(g)),
    };
  }

  async patchGroup(id: string, patch: ScimPatchOp, tenantId: string): Promise<ScimGroup> {
    const group = groupStore.get(id);
    if (!group || group._tenantId !== tenantId) {
      throw new Error(`Group ${id} not found`);
    }

    for (const op of patch.Operations) {
      if (op.path === 'members') {
        if (op.op === 'add' && Array.isArray(op.value)) {
          const newMembers = op.value as Array<{ value: string; display?: string }>;
          group.members = [
            ...(group.members ?? []),
            ...newMembers.map((m) => ({ value: m.value, display: m.display })),
          ];
        } else if (op.op === 'remove' && Array.isArray(op.value)) {
          const removeIds = new Set((op.value as Array<{ value: string }>).map((m) => m.value));
          group.members = (group.members ?? []).filter((m) => !removeIds.has(m.value));
        }
      } else if (op.op === 'replace' && op.path === 'displayName') {
        group.displayName = op.value as string;
      }
    }

    group.meta = {
      ...group.meta!,
      lastModified: nowIso(),
      version: `W/"${Date.now()}"`,
    };

    immutableAudit(
      'scim.group.patched' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimGroupId: id, tenantId, operations: patch.Operations.length } }
    );

    return this.stripGroupInternal(group);
  }

  async deleteGroup(id: string, tenantId: string): Promise<void> {
    const group = groupStore.get(id);
    if (!group || group._tenantId !== tenantId) {
      throw new Error(`Group ${id} not found`);
    }
    groupStore.delete(id);

    immutableAudit(
      'scim.group.deleted' as ImmutableAuditAction,
      'success',
      { sub: 'scim-provisioner', name: 'SCIM', roles: [] },
      { detail: { scimGroupId: id, tenantId } }
    );
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                           */
  /* ---------------------------------------------------------------- */

  private stripInternal(user: ScimUser & { _tenantId: string }): ScimUser {
    const { _tenantId, ...clean } = user;
    return clean;
  }

  private stripGroupInternal(group: ScimGroup & { _tenantId: string }): ScimGroup {
    const { _tenantId, ...clean } = group;
    return clean;
  }
}

/* ------------------------------------------------------------------ */
/* Singleton                                                           */
/* ------------------------------------------------------------------ */

let _connector: InProcessScimConnector | null = null;

export function getScimConnector(): InProcessScimConnector {
  if (!_connector) _connector = new InProcessScimConnector();
  return _connector;
}

/**
 * Get store sizes (for store-policy.ts registration).
 */
export function getScimStoreSizes(): { users: number; groups: number } {
  return { users: userStore.size, groups: groupStore.size };
}
