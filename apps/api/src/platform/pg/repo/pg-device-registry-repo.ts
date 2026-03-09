/**
 * PG Device Registry Repository — Async durable device management state
 *
 * Phase 526 (W38-C5): Device Registry Durability
 *
 * Tables: managed_device, device_patient_association, device_location_mapping,
 *         device_audit_log
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import {
  pgManagedDevice,
  pgDevicePatientAssociation,
  pgDeviceLocationMapping,
  pgDeviceAuditLog,
} from '../pg-schema.js';

export type ManagedDeviceRow = typeof pgManagedDevice.$inferSelect;
export type DevicePatientAssociationRow = typeof pgDevicePatientAssociation.$inferSelect;
export type DeviceLocationMappingRow = typeof pgDeviceLocationMapping.$inferSelect;
export type DeviceAuditLogRow = typeof pgDeviceAuditLog.$inferSelect;

function requireTenantId(tenantId?: string): string {
  if (typeof tenantId === 'string' && tenantId.trim().length > 0) {
    return tenantId.trim();
  }
  throw new Error('Tenant context required for device registry repository');
}

/* ═══════════════════ MANAGED DEVICE ═══════════════════ */

export async function insertManagedDevice(data: {
  id: string;
  tenantId?: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  deviceClass: string;
  protocols?: unknown[];
  gatewayId?: string;
  status?: string;
  firmwareVersion?: string;
  lastCalibration?: string;
  nextCalibration?: string;
  metadataJson?: unknown;
}): Promise<ManagedDeviceRow> {
  const db = getPgDb();
  const now = new Date();
  const tenantId = requireTenantId(data.tenantId);
  await db.insert(pgManagedDevice).values({
    id: data.id,
    tenantId,
    name: data.name,
    manufacturer: data.manufacturer,
    model: data.model,
    serialNumber: data.serialNumber,
    deviceClass: data.deviceClass,
    protocols: data.protocols ?? [],
    gatewayId: data.gatewayId ?? null,
    status: data.status ?? 'active',
    firmwareVersion: data.firmwareVersion ?? null,
    lastCalibration: data.lastCalibration ?? null,
    nextCalibration: data.nextCalibration ?? null,
    metadataJson: data.metadataJson ?? {},
    createdAt: now,
    updatedAt: now,
  } as any);
  const row = await findManagedDeviceById(data.id);
  return row!;
}

export async function findManagedDeviceById(id: string): Promise<ManagedDeviceRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgManagedDevice).where(eq(pgManagedDevice.id, id));
  return rows[0];
}

export async function findManagedDevicesByClass(
  deviceClass: string,
  tenantId: string
): Promise<ManagedDeviceRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgManagedDevice)
    .where(
      and(eq(pgManagedDevice.tenantId, resolvedTenantId), eq(pgManagedDevice.deviceClass, deviceClass))
    );
}

export async function findManagedDevicesByStatus(
  status: string,
  tenantId: string
): Promise<ManagedDeviceRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgManagedDevice)
    .where(and(eq(pgManagedDevice.tenantId, resolvedTenantId), eq(pgManagedDevice.status, status)));
}

export async function findManagedDevicesByGateway(
  gatewayId: string,
  tenantId: string
): Promise<ManagedDeviceRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgManagedDevice)
    .where(and(eq(pgManagedDevice.tenantId, resolvedTenantId), eq(pgManagedDevice.gatewayId, gatewayId)));
}

export async function findAllManagedDevices(tenantId: string): Promise<ManagedDeviceRow[]> {
  const db = getPgDb();
  return db.select().from(pgManagedDevice).where(eq(pgManagedDevice.tenantId, requireTenantId(tenantId)));
}

export async function updateManagedDevice(
  id: string,
  patch: Partial<{
    name: string;
    status: string;
    firmwareVersion: string;
    lastCalibration: string;
    nextCalibration: string;
    protocols: unknown[];
    gatewayId: string | null;
    metadataJson: unknown;
  }>
): Promise<ManagedDeviceRow | undefined> {
  const db = getPgDb();
  await db
    .update(pgManagedDevice)
    .set({
      ...patch,
      updatedAt: new Date(),
    } as any)
    .where(eq(pgManagedDevice.id, id));
  return findManagedDeviceById(id);
}

export async function deleteManagedDevice(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgManagedDevice).where(eq(pgManagedDevice.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ DEVICE-PATIENT ASSOCIATION ═══════════════════ */

export async function insertDevicePatientAssociation(data: {
  id: string;
  tenantId?: string;
  deviceId: string;
  patientDfn: string;
  location?: string;
  facilityCode?: string;
  status?: string;
  associatedBy: string;
  startedAt: string;
  endedAt?: string;
}): Promise<DevicePatientAssociationRow> {
  const db = getPgDb();
  const now = new Date();
  const tenantId = requireTenantId(data.tenantId);
  await db.insert(pgDevicePatientAssociation).values({
    id: data.id,
    tenantId,
    deviceId: data.deviceId,
    patientDfn: data.patientDfn,
    location: data.location ?? null,
    facilityCode: data.facilityCode ?? null,
    status: data.status ?? 'active',
    associatedBy: data.associatedBy,
    startedAt: data.startedAt,
    endedAt: data.endedAt ?? null,
    createdAt: now,
  } as any);
  const row = await findDevicePatientAssociationById(data.id);
  return row!;
}

export async function findDevicePatientAssociationById(
  id: string
): Promise<DevicePatientAssociationRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgDevicePatientAssociation)
    .where(eq(pgDevicePatientAssociation.id, id));
  return rows[0];
}

export async function findDevicePatientAssociationsByDevice(
  deviceId: string,
  tenantId: string
): Promise<DevicePatientAssociationRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgDevicePatientAssociation)
    .where(
      and(
        eq(pgDevicePatientAssociation.tenantId, resolvedTenantId),
        eq(pgDevicePatientAssociation.deviceId, deviceId)
      )
    )
    .orderBy(desc(pgDevicePatientAssociation.startedAt));
}

export async function findDevicePatientAssociationsByPatient(
  patientDfn: string,
  tenantId: string
): Promise<DevicePatientAssociationRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgDevicePatientAssociation)
    .where(
      and(
        eq(pgDevicePatientAssociation.tenantId, resolvedTenantId),
        eq(pgDevicePatientAssociation.patientDfn, patientDfn)
      )
    )
    .orderBy(desc(pgDevicePatientAssociation.startedAt));
}

export async function findActiveAssociations(
  tenantId: string
): Promise<DevicePatientAssociationRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgDevicePatientAssociation)
    .where(
      and(
        eq(pgDevicePatientAssociation.tenantId, resolvedTenantId),
        eq(pgDevicePatientAssociation.status, 'active')
      )
    );
}

export async function updateDevicePatientAssociation(
  id: string,
  patch: Partial<{
    status: string;
    endedAt: string;
    location: string;
  }>
): Promise<DevicePatientAssociationRow | undefined> {
  const db = getPgDb();
  await db
    .update(pgDevicePatientAssociation)
    .set(patch as any)
    .where(eq(pgDevicePatientAssociation.id, id));
  return findDevicePatientAssociationById(id);
}

export async function deleteDevicePatientAssociation(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db
    .delete(pgDevicePatientAssociation)
    .where(eq(pgDevicePatientAssociation.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ DEVICE-LOCATION MAPPING ═══════════════════ */

export async function insertDeviceLocationMapping(data: {
  id: string;
  tenantId?: string;
  deviceId: string;
  ward: string;
  room: string;
  bed: string;
  facilityCode: string;
  active?: boolean;
  mappedAt: string;
}): Promise<DeviceLocationMappingRow> {
  const db = getPgDb();
  const now = new Date();
  const tenantId = requireTenantId(data.tenantId);
  await db.insert(pgDeviceLocationMapping).values({
    id: data.id,
    tenantId,
    deviceId: data.deviceId,
    ward: data.ward,
    room: data.room,
    bed: data.bed,
    facilityCode: data.facilityCode,
    active: data.active ?? true,
    mappedAt: data.mappedAt,
    createdAt: now,
  } as any);
  const row = await findDeviceLocationMappingById(data.id);
  return row!;
}

export async function findDeviceLocationMappingById(
  id: string
): Promise<DeviceLocationMappingRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgDeviceLocationMapping)
    .where(eq(pgDeviceLocationMapping.id, id));
  return rows[0];
}

export async function findDeviceLocationMappingsByDevice(
  deviceId: string,
  tenantId: string
): Promise<DeviceLocationMappingRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgDeviceLocationMapping)
    .where(
      and(
        eq(pgDeviceLocationMapping.tenantId, resolvedTenantId),
        eq(pgDeviceLocationMapping.deviceId, deviceId)
      )
    );
}

export async function findActiveDeviceLocationMappings(
  tenantId: string
): Promise<DeviceLocationMappingRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgDeviceLocationMapping)
    .where(
      and(eq(pgDeviceLocationMapping.tenantId, resolvedTenantId), eq(pgDeviceLocationMapping.active, true))
    );
}

export async function updateDeviceLocationMapping(
  id: string,
  patch: Partial<{
    active: boolean;
    ward: string;
    room: string;
    bed: string;
  }>
): Promise<DeviceLocationMappingRow | undefined> {
  const db = getPgDb();
  await db
    .update(pgDeviceLocationMapping)
    .set(patch as any)
    .where(eq(pgDeviceLocationMapping.id, id));
  return findDeviceLocationMappingById(id);
}

export async function deleteDeviceLocationMapping(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(pgDeviceLocationMapping).where(eq(pgDeviceLocationMapping.id, id));
  return (result as any).rowCount > 0;
}

/* ═══════════════════ DEVICE AUDIT LOG ═══════════════════ */

export async function insertDeviceAuditLog(data: {
  id: string;
  tenantId?: string;
  deviceId: string;
  action: string;
  actor: string;
  detail?: unknown;
  timestamp: string;
}): Promise<DeviceAuditLogRow> {
  const db = getPgDb();
  const now = new Date();
  const tenantId = requireTenantId(data.tenantId);
  await db.insert(pgDeviceAuditLog).values({
    id: data.id,
    tenantId,
    deviceId: data.deviceId,
    action: data.action,
    actor: data.actor,
    detail: data.detail ?? {},
    timestamp: data.timestamp,
    createdAt: now,
  } as any);
  const row = await findDeviceAuditLogById(data.id);
  return row!;
}

export async function findDeviceAuditLogById(id: string): Promise<DeviceAuditLogRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgDeviceAuditLog).where(eq(pgDeviceAuditLog.id, id));
  return rows[0];
}

export async function findDeviceAuditByDevice(
  deviceId: string,
  tenantId: string
): Promise<DeviceAuditLogRow[]> {
  const db = getPgDb();
  const resolvedTenantId = requireTenantId(tenantId);
  return db
    .select()
    .from(pgDeviceAuditLog)
    .where(and(eq(pgDeviceAuditLog.tenantId, resolvedTenantId), eq(pgDeviceAuditLog.deviceId, deviceId)))
    .orderBy(desc(pgDeviceAuditLog.timestamp));
}

export async function findAllDeviceAuditLogs(
  tenantId: string,
  limit = 100
): Promise<DeviceAuditLogRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(pgDeviceAuditLog)
    .where(eq(pgDeviceAuditLog.tenantId, requireTenantId(tenantId)))
    .orderBy(desc(pgDeviceAuditLog.timestamp))
    .limit(limit);
}
