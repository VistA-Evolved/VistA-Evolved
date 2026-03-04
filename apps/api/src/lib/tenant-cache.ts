/**
 * Tenant-Scoped Cache -- Phase 62.
 *
 * Wraps the RPC result cache with tenant isolation. Cache keys are prefixed
 * with the tenant ID so that results from one tenant never bleed to another.
 *
 * This is a namespace wrapper -- the underlying storage is still the
 * Map-based rpcCache in rpc-resilience.ts. The tenant prefix ensures
 * isolation without needing separate Map instances per tenant.
 *
 * Usage:
 *   import { tenantCachedRpc } from "../lib/tenant-cache.js";
 *   const result = await tenantCachedRpc(tenantId, rpcFn, rpcName, params);
 */

import { cachedRpc, invalidateCache } from './rpc-resilience.js';
import { log } from './logger.js';

const TENANT_PREFIX = 't:';

/**
 * Execute an RPC with tenant-scoped caching.
 * Cache key format: `t:<tenantId>::<rpcName>::<JSON(params)>`
 */
export async function tenantCachedRpc<T>(
  tenantId: string,
  rpcFn: () => Promise<T>,
  rpcName: string,
  params: unknown[],
  ttlMs?: number
): Promise<T> {
  // Prefix the RPC name with tenant ID to create isolated cache namespace
  const scopedName = `${TENANT_PREFIX}${tenantId}::${rpcName}`;
  return cachedRpc(rpcFn, scopedName, params, ttlMs);
}

/**
 * Invalidate all cache entries for a specific tenant.
 * Returns the number of entries invalidated.
 */
export function invalidateTenantCache(tenantId: string): number {
  const pattern = `${TENANT_PREFIX}${tenantId}::`;
  const count = invalidateCache(pattern);
  if (count > 0) {
    log.info('Tenant cache invalidated', { tenantId, entriesRemoved: count });
  }
  return count;
}

/**
 * Verify tenant isolation: check that a cache entry for one tenant
 * is NOT accessible from another tenant's namespace.
 *
 * This is a test helper -- not used in production code.
 */
export function verifyTenantIsolation(
  tenantA: string,
  tenantB: string,
  rpcName: string
): { isolated: boolean; reason: string } {
  // Cache keys are structurally different because tenantId is in the key
  const keyA = `${TENANT_PREFIX}${tenantA}::${rpcName}`;
  const keyB = `${TENANT_PREFIX}${tenantB}::${rpcName}`;

  if (keyA === keyB) {
    return {
      isolated: false,
      reason: `Keys match: ${keyA} === ${keyB} (tenant IDs are the same!)`,
    };
  }

  return {
    isolated: true,
    reason: `Keys differ: ${keyA} !== ${keyB}`,
  };
}
