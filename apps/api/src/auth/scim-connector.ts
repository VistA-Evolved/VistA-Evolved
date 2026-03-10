/**
 * SCIM Connector Interface -- Phase 141: Enterprise IAM Posture.
 *
 * System for Cross-domain Identity Management (SCIM 2.0) placeholder.
 * This interface defines the contract for future SCIM integration,
 * enabling automated user provisioning/deprovisioning from identity
 * providers like Azure AD, Okta, or OneLogin.
 *
 * Current status: PLACEHOLDER -- no implementation.
 * The interface is ready for implementation when the organization
 * deploys an IdP with SCIM 2.0 support.
 *
 * SCIM 2.0 spec: RFC 7643 (Core Schema) + RFC 7644 (Protocol)
 *
 * Future implementation targets:
 *   - POST /scim/v2/Users -- Create user
 *   - GET  /scim/v2/Users/:id -- Read user
 *   - PUT  /scim/v2/Users/:id -- Replace user
 *   - PATCH /scim/v2/Users/:id -- Update user attributes
 *   - DELETE /scim/v2/Users/:id -- Deactivate user
 *   - GET  /scim/v2/Users -- List/filter users
 *   - POST /scim/v2/Bulk -- Bulk operations
 *   - GET  /scim/v2/ServiceProviderConfig -- Capability discovery
 *   - GET  /scim/v2/Schemas -- Schema discovery
 *   - GET  /scim/v2/ResourceTypes -- Resource type discovery
 */

import type { UserRole } from './session-store.js';

/* ================================================================== */
/* SCIM 2.0 Core Types                                                 */
/* ================================================================== */

/** SCIM User resource (RFC 7643 Section 4.1) */
export interface ScimUser {
  /** SCIM schema URIs */
  schemas: string[];
  /** Unique resource identifier (assigned by service provider) */
  id?: string;
  /** Unique external identifier (assigned by provisioning client) */
  externalId?: string;
  /** User metadata */
  meta?: ScimMeta;
  /** Username (unique, used for login binding) */
  userName: string;
  /** Name components */
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
    middleName?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
  };
  /** Display name */
  displayName?: string;
  /** Email addresses */
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  /** Whether the user is active */
  active?: boolean;
  /** Groups the user belongs to (read-only in user resource) */
  groups?: Array<{
    value: string; // group ID
    display?: string;
    $ref?: string;
  }>;
  /** VistA-specific extension */
  'urn:ietf:params:scim:schemas:extension:vista:2.0:User'?: {
    duz?: string;
    facilityStation?: string;
    role?: UserRole;
    tenantId?: string;
  };
}

/** SCIM resource metadata (RFC 7643 Section 3.1) */
export interface ScimMeta {
  resourceType: string;
  created?: string;
  lastModified?: string;
  location?: string;
  version?: string;
}

/** SCIM List response (RFC 7644 Section 3.4.2) */
export interface ScimListResponse<T> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

/** SCIM Error response (RFC 7644 Section 3.12) */
export interface ScimError {
  schemas: string[];
  detail: string;
  status: string;
  scimType?: string;
}

/** SCIM Patch operation (RFC 7644 Section 3.5.2) */
export interface ScimPatchOp {
  schemas: string[];
  Operations: Array<{
    op: 'add' | 'remove' | 'replace';
    path?: string;
    value?: unknown;
  }>;
}

/* ================================================================== */
/* SCIM Connector Interface                                            */
/* ================================================================== */

/**
 * SCIM Connector interface -- contract for SCIM 2.0 integration.
 *
 * Implementations should:
 *   1. Map SCIM users to VistA user accounts (via DUZ binding)
 *   2. Support group-based role assignment (via IdP role mapper)
 *   3. Enforce tenant isolation on all operations
 *   4. Audit all provisioning changes via immutable audit
 *   5. Never create VistA accounts directly -- SCIM maps to platform sessions
 */
export interface ScimConnector {
  /** Get SCIM service provider configuration */
  getServiceProviderConfig(): ScimServiceProviderConfig;

  /** Create a new user from SCIM provisioning */
  createUser(user: ScimUser, tenantId: string): Promise<ScimUser>;

  /** Get user by SCIM ID */
  getUser(id: string, tenantId: string): Promise<ScimUser | null>;

  /** List/filter users */
  listUsers(
    filter?: string,
    startIndex?: number,
    count?: number,
    tenantId?: string
  ): Promise<ScimListResponse<ScimUser>>;

  /** Replace user (full update) */
  replaceUser(id: string, user: ScimUser, tenantId: string): Promise<ScimUser>;

  /** Patch user (partial update) */
  patchUser(id: string, patch: ScimPatchOp, tenantId: string): Promise<ScimUser>;

  /** Deactivate user (SCIM DELETE = deactivate, not hard delete) */
  deactivateUser(id: string, tenantId: string): Promise<void>;
}

/** SCIM Service Provider Configuration (RFC 7643 Section 5) */
export interface ScimServiceProviderConfig {
  schemas: string[];
  documentationUri?: string;
  patch: { supported: boolean };
  bulk: { supported: boolean; maxOperations: number; maxPayloadSize: number };
  filter: { supported: boolean; maxResults: number };
  changePassword: { supported: boolean };
  sort: { supported: boolean };
  etag: { supported: boolean };
  authenticationSchemes: Array<{
    type: string;
    name: string;
    description: string;
  }>;
}

/* ================================================================== */
/* Placeholder / Stub Implementation                                   */
/* ================================================================== */

/**
 * Stub SCIM connector -- returns "not implemented" for all operations.
 * Used as the default until a real SCIM integration is configured.
 */
export class StubScimConnector implements ScimConnector {
  getServiceProviderConfig(): ScimServiceProviderConfig {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri: 'https://github.com/VistA-Evolved/docs/scim',
      patch: { supported: false },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: false, maxResults: 0 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: 'oauthbearertoken',
          name: 'OAuth Bearer Token',
          description: 'Authentication scheme using the OAuth Bearer Token standard (RFC 6750)',
        },
      ],
    };
  }

  async createUser(_user: ScimUser, _tenantId: string): Promise<ScimUser> {
    throw new ScimNotImplementedError('SCIM user provisioning is not yet implemented');
  }

  async getUser(_id: string, _tenantId: string): Promise<ScimUser | null> {
    throw new ScimNotImplementedError('SCIM user read is not yet implemented');
  }

  async listUsers(): Promise<ScimListResponse<ScimUser>> {
    throw new ScimNotImplementedError('SCIM user listing is not yet implemented');
  }

  async replaceUser(_id: string, _user: ScimUser, _tenantId: string): Promise<ScimUser> {
    throw new ScimNotImplementedError('SCIM user replace is not yet implemented');
  }

  async patchUser(_id: string, _patch: ScimPatchOp, _tenantId: string): Promise<ScimUser> {
    throw new ScimNotImplementedError('SCIM user patch is not yet implemented');
  }

  async deactivateUser(_id: string, _tenantId: string): Promise<void> {
    throw new ScimNotImplementedError('SCIM user deactivation is not yet implemented');
  }
}

/** Custom error for SCIM not-implemented operations */
export class ScimNotImplementedError extends Error {
  public readonly statusCode = 501;
  public readonly scimType = 'invalidValue';

  constructor(message: string) {
    super(message);
    this.name = 'ScimNotImplementedError';
  }
}

/**
 * Get the current SCIM connector readiness status.
 */
export function getScimReadinessStatus(): {
  ready: boolean;
  connector: string;
  interfaceDefined: boolean;
  implementation: string;
} {
  return {
    ready: false,
    connector: 'stub',
    interfaceDefined: true,
    implementation: 'placeholder -- awaiting IdP SCIM 2.0 integration',
  };
}
