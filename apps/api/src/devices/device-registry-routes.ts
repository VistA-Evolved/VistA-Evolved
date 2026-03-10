/**
 * Device Registry -- Routes
 *
 * Phase 380 (W21-P3): REST endpoints for managed device inventory,
 * patient association, location mapping, and device audit.
 *
 * Auth: admin (via AUTH_RULES /devices/ prefix)
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  registerDevice,
  getDevice,
  getDeviceBySerial,
  listDevices,
  updateDevice,
  changeDeviceStatus,
  decommissionDevice,
  associatePatient,
  disassociatePatient,
  getActiveAssociation,
  listAssociations,
  mapDeviceLocation,
  getDeviceLocation,
  listLocationMappings,
  getDeviceAudit,
  getRegistryStats,
} from './device-registry-store.js';
import type { DeviceClass, DeviceStatus } from './device-registry.types.js';

const DEFAULT_TENANT = 'default';

function tenantId(request: FastifyRequest): string {
  const requestTenantId = (request as any).tenantId || (request as any).session?.tenantId;
  if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
    return requestTenantId.trim();
  }
  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) {
    return headerTenantId.trim();
  }
  return DEFAULT_TENANT;
}

export default async function deviceRegistryRoutes(server: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // Device CRUD
  // -----------------------------------------------------------------------

  /** POST /devices -- Register a new device */
  server.post('/devices', async (request, reply) => {
    const body = (request.body as any) || {};
    const {
      name,
      manufacturer,
      model,
      serialNumber,
      deviceClass,
      protocols,
      gatewayId,
      firmwareVersion,
      metadata,
    } = body;
    if (!name || !manufacturer || !model || !serialNumber || !deviceClass) {
      return reply.code(400).send({
        ok: false,
        error: 'name, manufacturer, model, serialNumber, deviceClass required',
      });
    }
    const result = registerDevice({
      name,
      manufacturer,
      model,
      serialNumber,
      deviceClass,
      protocols,
      gatewayId,
      firmwareVersion,
      metadata,
      tenantId: tenantId(request),
      actor: 'admin',
    });
    if ('error' in result) {
      return reply.code(409).send({ ok: false, error: result.error });
    }
    return reply.code(201).send({ ok: true, device: result });
  });

  /** GET /devices -- List devices */
  server.get('/devices', async (request, reply) => {
    const query = request.query as {
      gatewayId?: string;
      deviceClass?: DeviceClass;
      status?: DeviceStatus;
    };
    const items = listDevices({
      tenantId: tenantId(request),
      gatewayId: query.gatewayId,
      deviceClass: query.deviceClass,
      status: query.status,
    });
    return { ok: true, devices: items, total: items.length };
  });

  /** GET /devices/:id -- Get single device */
  server.get('/devices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const dev = getDevice(id, tenantId(request));
    if (!dev) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, device: dev };
  });

  /** GET /devices/by-serial -- Lookup by serial number */
  server.get('/devices/by-serial', async (request, reply) => {
    const query = request.query as { serial: string };
    if (!query.serial) {
      return reply.code(400).send({ ok: false, error: 'serial required' });
    }
    const dev = getDeviceBySerial(query.serial, tenantId(request));
    if (!dev) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, device: dev };
  });

  /** PATCH /devices/:id -- Update device */
  server.patch('/devices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    // Allowlist only safe fields to prevent injection of id/tenantId/serialNumber
    const allowed: Record<string, unknown> = {};
    for (const key of [
      'name',
      'manufacturer',
      'model',
      'firmwareVersion',
      'protocols',
      'gatewayId',
      'metadata',
      'status',
      'lastCalibration',
      'nextCalibration',
    ]) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }
    const dev = updateDevice(tenantId(request), id, allowed, 'admin');
    if (!dev) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, device: dev };
  });

  /** PATCH /devices/:id/status -- Change device status */
  server.patch('/devices/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: 'status required' });
    }
    const dev = changeDeviceStatus(tenantId(request), id, body.status, 'admin');
    if (!dev) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, device: dev };
  });

  /** POST /devices/:id/decommission -- Decommission device */
  server.post('/devices/:id/decommission', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = decommissionDevice(tenantId(request), id, 'admin');
    if (!ok) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, status: 'decommissioned' };
  });

  // -----------------------------------------------------------------------
  // Patient Association
  // -----------------------------------------------------------------------

  /** POST /devices/:id/associate -- Associate device with patient */
  server.post('/devices/:id/associate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!body.patientDfn) {
      return reply.code(400).send({ ok: false, error: 'patientDfn required' });
    }
    const result = associatePatient({
      deviceId: id,
      patientDfn: body.patientDfn,
      location: body.location,
      facilityCode: body.facilityCode,
      associatedBy: body.associatedBy || 'admin',
      tenantId: tenantId(request),
    });
    if ('error' in result) {
      return reply.code(400).send({ ok: false, error: result.error });
    }
    return reply.code(201).send({ ok: true, association: result });
  });

  /** POST /devices/:id/disassociate -- End patient association */
  server.post('/devices/:id/disassociate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = disassociatePatient(tenantId(request), id, 'admin');
    if (!ok) return reply.code(404).send({ ok: false, error: 'no_active_association' });
    return { ok: true, status: 'disassociated' };
  });

  /** GET /devices/:id/association -- Get active association */
  server.get('/devices/:id/association', async (request, reply) => {
    const { id } = request.params as { id: string };
    const assoc = getActiveAssociation(tenantId(request), id);
    if (!assoc) {
      return { ok: true, association: null, message: 'no_active_association' };
    }
    return { ok: true, association: assoc };
  });

  /** GET /devices/associations -- List all associations */
  server.get('/devices/associations', async (request, reply) => {
    const query = request.query as {
      deviceId?: string;
      patientDfn?: string;
      status?: string;
    };
    const items = listAssociations({
      deviceId: query.deviceId,
      patientDfn: query.patientDfn,
      status: query.status as any,
      tenantId: tenantId(request),
    });
    return { ok: true, associations: items, total: items.length };
  });

  // -----------------------------------------------------------------------
  // Location Mapping
  // -----------------------------------------------------------------------

  /** POST /devices/:id/location -- Map device to location */
  server.post('/devices/:id/location', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!body.ward || !body.room || !body.bed || !body.facilityCode) {
      return reply.code(400).send({
        ok: false,
        error: 'ward, room, bed, facilityCode required',
      });
    }
    const result = mapDeviceLocation({
      deviceId: id,
      ward: body.ward,
      room: body.room,
      bed: body.bed,
      facilityCode: body.facilityCode,
      tenantId: tenantId(request),
    });
    if ('error' in result) {
      return reply.code(400).send({ ok: false, error: result.error });
    }
    return reply.code(201).send({ ok: true, location: result });
  });

  /** GET /devices/:id/location -- Get device location */
  server.get('/devices/:id/location', async (request, reply) => {
    const { id } = request.params as { id: string };
    const loc = getDeviceLocation(tenantId(request), id);
    if (!loc) return { ok: true, location: null, message: 'no_location_mapped' };
    return { ok: true, location: loc };
  });

  /** GET /devices/locations -- List location mappings */
  server.get('/devices/locations', async (request, reply) => {
    const query = request.query as {
      ward?: string;
      facilityCode?: string;
    };
    const items = listLocationMappings({
      ward: query.ward,
      facilityCode: query.facilityCode,
      tenantId: tenantId(request),
    });
    return { ok: true, locations: items, total: items.length };
  });

  // -----------------------------------------------------------------------
  // Audit + Stats
  // -----------------------------------------------------------------------

  /** GET /devices/:id/audit -- Device audit trail */
  server.get('/devices/:id/audit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };
    const entries = getDeviceAudit(tenantId(request), id, parseInt(query.limit || '100', 10));
    return { ok: true, audit: entries, total: entries.length };
  });

  /** GET /devices/audit -- All device audit entries */
  server.get('/devices/audit', async (request, reply) => {
    const query = request.query as { limit?: string };
    const entries = getDeviceAudit(tenantId(request), undefined, parseInt(query.limit || '100', 10));
    return { ok: true, audit: entries, total: entries.length };
  });

  /** GET /devices/stats -- Registry statistics */
  server.get('/devices/stats', async (request, reply) => {
    return { ok: true, stats: getRegistryStats(tenantId(request)) };
  });
}
