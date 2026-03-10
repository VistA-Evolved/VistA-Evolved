/**
 * HL7v2 Tenant Endpoint Configuration -- Phase 258
 *
 * Manages per-tenant HL7v2 endpoint configuration for inbound and outbound
 * MLLP connections. Shared engine with tenant routing keys.
 *
 * In-memory store; matches imaging worklist pattern from Phase 23.
 */

import { randomBytes } from 'node:crypto';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type EndpointDirection = 'inbound' | 'outbound' | 'bidirectional';
export type EndpointStatus = 'active' | 'inactive' | 'testing' | 'error';

export interface Hl7TenantEndpoint {
  /** Unique endpoint ID */
  id: string;
  /** Tenant ID this endpoint belongs to */
  tenantId: string;
  /** Human-readable name */
  name: string;
  /** Direction of message flow */
  direction: EndpointDirection;
  /** Current status */
  status: EndpointStatus;
  /** For outbound: remote host */
  remoteHost?: string;
  /** For outbound: remote port */
  remotePort?: number;
  /** Sending facility filter (MSH-4) for inbound routing */
  sendingFacility?: string;
  /** Sending application filter (MSH-3) for inbound routing */
  sendingApplication?: string;
  /** Receiving facility (set when forwarding outbound) */
  receivingFacility?: string;
  /** Message types this endpoint handles (empty = all) */
  messageTypes: string[];
  /** Whether PHI logging is enabled (requires break-glass) */
  phiLoggingEnabled: boolean;
  /** TLS enabled for MLLPS */
  tlsEnabled: boolean;
  /** ISO timestamp */
  createdAt: string;
  updatedAt: string;
}

export interface CreateEndpointRequest {
  tenantId: string;
  name: string;
  direction: EndpointDirection;
  remoteHost?: string;
  remotePort?: number;
  sendingFacility?: string;
  sendingApplication?: string;
  receivingFacility?: string;
  messageTypes?: string[];
  tlsEnabled?: boolean;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const endpointStore = new Map<string, Hl7TenantEndpoint>();

function generateEndpointId(): string {
  return `hl7ep-${randomBytes(6).toString('hex')}`;
}

export function createEndpoint(req: CreateEndpointRequest): Hl7TenantEndpoint {
  const now = new Date().toISOString();
  const endpoint: Hl7TenantEndpoint = {
    id: generateEndpointId(),
    tenantId: req.tenantId,
    name: req.name,
    direction: req.direction,
    status: 'inactive',
    remoteHost: req.remoteHost,
    remotePort: req.remotePort,
    sendingFacility: req.sendingFacility,
    sendingApplication: req.sendingApplication,
    receivingFacility: req.receivingFacility,
    messageTypes: req.messageTypes || [],
    phiLoggingEnabled: false,
    tlsEnabled: req.tlsEnabled || false,
    createdAt: now,
    updatedAt: now,
  };
  endpointStore.set(endpoint.id, endpoint);
  log.info('HL7 tenant endpoint created', {
    component: 'hl7-tenant',
    endpointId: endpoint.id,
    tenantId: req.tenantId,
    direction: req.direction,
  });
  return endpoint;
}

export function getEndpoint(id: string): Hl7TenantEndpoint | undefined {
  return endpointStore.get(id);
}

export function getEndpointForTenant(
  tenantId: string,
  id: string
): Hl7TenantEndpoint | undefined {
  const endpoint = endpointStore.get(id);
  if (!endpoint || endpoint.tenantId !== tenantId) return undefined;
  return endpoint;
}

export function listEndpoints(tenantId?: string): Hl7TenantEndpoint[] {
  const all = Array.from(endpointStore.values());
  if (tenantId) return all.filter((e) => e.tenantId === tenantId);
  return all;
}

export function updateEndpoint(
  tenantId: string,
  id: string,
  updates: Partial<
    Pick<
      Hl7TenantEndpoint,
      | 'name'
      | 'status'
      | 'remoteHost'
      | 'remotePort'
      | 'sendingFacility'
      | 'sendingApplication'
      | 'receivingFacility'
      | 'messageTypes'
      | 'tlsEnabled'
    >
  >
): Hl7TenantEndpoint {
  const ep = getEndpointForTenant(tenantId, id);
  if (!ep) throw new Error(`Endpoint not found: ${id}`);
  Object.assign(ep, updates, { updatedAt: new Date().toISOString() });
  return ep;
}

export function deleteEndpoint(tenantId: string, id: string): boolean {
  const endpoint = getEndpointForTenant(tenantId, id);
  if (!endpoint) return false;
  return endpointStore.delete(id);
}

export function getEndpointsByTenant(tenantId: string): Hl7TenantEndpoint[] {
  return Array.from(endpointStore.values()).filter((e) => e.tenantId === tenantId);
}

export function resolveInboundEndpoint(
  sendingFacility: string,
  sendingApp: string,
  messageType: string
): Hl7TenantEndpoint | undefined {
  for (const ep of endpointStore.values()) {
    if (ep.status !== 'active') continue;
    if (ep.direction === 'outbound') continue;
    if (ep.sendingFacility && ep.sendingFacility !== sendingFacility) continue;
    if (ep.sendingApplication && ep.sendingApplication !== sendingApp) continue;
    if (ep.messageTypes.length > 0 && !ep.messageTypes.includes(messageType)) continue;
    return ep;
  }
  return undefined;
}
