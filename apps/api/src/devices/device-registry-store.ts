/**
 * Device Registry — Store
 *
 * Phase 380 (W21-P3): In-memory store for managed device inventory,
 * patient associations, location mappings, and audit trail.
 *
 * Pattern: follows gateway-store.ts, imaging-devices.ts
 *
 * Migration plan:
 * 1. In-memory Map (current)
 * 2. PG-backed via device repo (v60) — Phase 526 (W38) write-through wired
 * 3. VistA Equipment file (File 6914) integration (future)
 */

import * as crypto from "node:crypto";
import { log } from "../lib/logger.js";
import type {
  ManagedDevice,
  DeviceStatus,
  DeviceClass,
  DevicePatientAssociation,
  AssociationStatus,
  DeviceLocationMapping,
  DeviceAuditEntry,
  DeviceAuditAction,
} from "./device-registry.types.js";

// ── PG Write-Through (Phase 526 / W38) ────────────────────────────

interface DeviceDbRepo {
  insertManagedDevice(data: any): Promise<any>;
  updateManagedDevice(id: string, patch: any): Promise<any>;
  insertDevicePatientAssociation(data: any): Promise<any>;
  updateDevicePatientAssociation(id: string, patch: any): Promise<any>;
  insertDeviceLocationMapping(data: any): Promise<any>;
}

let dbRepo: DeviceDbRepo | null = null;

export function initDeviceRegistryStoreRepo(repo: DeviceDbRepo): void {
  dbRepo = repo;
}

function dbWarn(op: string, err: any): void {
  if (process.env.NODE_ENV !== "test") {
    log.warn(`[device-registry] DB ${op} failed (cache-only fallback)`, { err: err?.message ?? err });
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_DEVICES = parseInt(process.env.MAX_MANAGED_DEVICES || "5000", 10);
const MAX_ASSOCIATIONS = parseInt(
  process.env.MAX_DEVICE_ASSOCIATIONS || "10000",
  10
);
const MAX_AUDIT = parseInt(process.env.MAX_DEVICE_AUDIT || "20000", 10);
const DEFAULT_TENANT = "default";

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

const devices = new Map<string, ManagedDevice>();
const associations = new Map<string, DevicePatientAssociation>();
const locationMappings = new Map<string, DeviceLocationMapping>();
const auditLog: DeviceAuditEntry[] = [];

// Serial number uniqueness index: tenantId:serial -> deviceId
const serialIndex = new Map<string, string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function now(): string {
  return new Date().toISOString();
}

function evictOldest<K, V>(map: Map<K, V>, max: number): void {
  while (map.size > max) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
}

function appendAudit(
  deviceId: string,
  action: DeviceAuditAction,
  actor: string,
  detail: Record<string, unknown>,
  tenantId: string
): void {
  if (auditLog.length >= MAX_AUDIT) auditLog.shift();
  auditLog.push({
    id: generateId("da"),
    deviceId,
    action,
    actor,
    detail,
    timestamp: now(),
    tenantId,
  });
}

// ---------------------------------------------------------------------------
// Device CRUD
// ---------------------------------------------------------------------------

export function registerDevice(opts: {
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  deviceClass: DeviceClass;
  protocols?: string[];
  gatewayId?: string;
  firmwareVersion?: string;
  metadata?: Record<string, string>;
  tenantId?: string;
  actor?: string;
}): ManagedDevice | { error: string } {
  const tid = opts.tenantId || DEFAULT_TENANT;

  // Serial uniqueness check
  const serialKey = `${tid}:${opts.serialNumber}`;
  if (serialIndex.has(serialKey)) {
    return { error: "duplicate_serial" };
  }

  evictOldest(devices, MAX_DEVICES - 1);

  const id = generateId("dev");
  const ts = now();
  const device: ManagedDevice = {
    id,
    tenantId: tid,
    name: opts.name,
    manufacturer: opts.manufacturer,
    model: opts.model,
    serialNumber: opts.serialNumber,
    deviceClass: opts.deviceClass,
    protocols: opts.protocols || [],
    gatewayId: opts.gatewayId,
    status: "active",
    firmwareVersion: opts.firmwareVersion,
    metadata: opts.metadata || {},
    createdAt: ts,
    updatedAt: ts,
  };

  devices.set(id, device);
  serialIndex.set(serialKey, id);
  appendAudit(id, "registered", opts.actor || "system", { name: opts.name }, tid);

  if (dbRepo) {
    dbRepo.insertManagedDevice({
      id, tenantId: tid, name: opts.name, manufacturer: opts.manufacturer,
      model: opts.model, serialNumber: opts.serialNumber, deviceClass: opts.deviceClass,
      protocols: opts.protocols || [], gatewayId: opts.gatewayId ?? null,
      status: "active", firmwareVersion: opts.firmwareVersion ?? null,
      metadata: opts.metadata || {},
    }).catch((e: unknown) => dbWarn("insertManagedDevice", e));
  }

  return device;
}

export function getDevice(id: string): ManagedDevice | undefined {
  return devices.get(id);
}

export function getDeviceBySerial(
  serialNumber: string,
  tenantId: string = DEFAULT_TENANT
): ManagedDevice | undefined {
  const key = `${tenantId}:${serialNumber}`;
  const deviceId = serialIndex.get(key);
  return deviceId ? devices.get(deviceId) : undefined;
}

export function listDevices(opts?: {
  tenantId?: string;
  gatewayId?: string;
  deviceClass?: DeviceClass;
  status?: DeviceStatus;
}): ManagedDevice[] {
  let results = Array.from(devices.values());
  if (opts?.tenantId)
    results = results.filter((d) => d.tenantId === opts.tenantId);
  if (opts?.gatewayId)
    results = results.filter((d) => d.gatewayId === opts.gatewayId);
  if (opts?.deviceClass)
    results = results.filter((d) => d.deviceClass === opts.deviceClass);
  if (opts?.status)
    results = results.filter((d) => d.status === opts.status);
  return results;
}

export function updateDevice(
  id: string,
  updates: Partial<
    Pick<
      ManagedDevice,
      | "name"
      | "manufacturer"
      | "model"
      | "firmwareVersion"
      | "protocols"
      | "gatewayId"
      | "metadata"
      | "status"
      | "lastCalibration"
      | "nextCalibration"
    >
  >,
  actor: string = "system"
): ManagedDevice | undefined {
  const dev = devices.get(id);
  if (!dev) return undefined;
  Object.assign(dev, updates, { updatedAt: now() });
  appendAudit(id, "updated", actor, updates, dev.tenantId);

  if (dbRepo) {
    dbRepo.updateManagedDevice(id, updates).catch((e: unknown) => dbWarn("updateManagedDevice", e));
  }

  return dev;
}

export function changeDeviceStatus(
  id: string,
  status: DeviceStatus,
  actor: string = "system"
): ManagedDevice | undefined {
  const dev = devices.get(id);
  if (!dev) return undefined;
  const prev = dev.status;
  dev.status = status;
  dev.updatedAt = now();
  appendAudit(id, "status_changed", actor, { from: prev, to: status }, dev.tenantId);

  if (dbRepo) {
    dbRepo.updateManagedDevice(id, { status }).catch((e: unknown) => dbWarn("updateManagedDevice/status", e));
  }

  return dev;
}

export function decommissionDevice(
  id: string,
  actor: string = "system"
): boolean {
  const dev = devices.get(id);
  if (!dev) return false;
  dev.status = "decommissioned";
  dev.updatedAt = now();
  // End all active associations
  for (const [, assoc] of associations) {
    if (assoc.deviceId === id && assoc.status === "active") {
      assoc.status = "ended";
      assoc.endedAt = now();
    }
  }
  appendAudit(id, "decommissioned", actor, {}, dev.tenantId);

  if (dbRepo) {
    dbRepo.updateManagedDevice(id, { status: "decommissioned" }).catch((e: unknown) => dbWarn("updateManagedDevice/decommission", e));
  }

  return true;
}

// ---------------------------------------------------------------------------
// Patient Association
// ---------------------------------------------------------------------------

export function associatePatient(opts: {
  deviceId: string;
  patientDfn: string;
  location?: string;
  facilityCode?: string;
  associatedBy: string;
  tenantId?: string;
}): DevicePatientAssociation | { error: string } {
  const dev = devices.get(opts.deviceId);
  if (!dev) return { error: "device_not_found" };
  if (dev.status === "decommissioned") return { error: "device_decommissioned" };

  // End any existing active association for this device
  for (const [, assoc] of associations) {
    if (
      assoc.deviceId === opts.deviceId &&
      assoc.status === "active"
    ) {
      assoc.status = "ended";
      assoc.endedAt = now();
    }
  }

  evictOldest(associations, MAX_ASSOCIATIONS - 1);

  const id = generateId("assoc");
  const tid = opts.tenantId || dev.tenantId;
  const assoc: DevicePatientAssociation = {
    id,
    deviceId: opts.deviceId,
    patientDfn: opts.patientDfn,
    location: opts.location,
    facilityCode: opts.facilityCode,
    status: "active",
    associatedBy: opts.associatedBy,
    startedAt: now(),
    tenantId: tid,
  };

  associations.set(id, assoc);
  appendAudit(
    opts.deviceId,
    "associated",
    opts.associatedBy,
    { patientDfn: opts.patientDfn, location: opts.location },
    tid
  );

  if (dbRepo) {
    dbRepo.insertDevicePatientAssociation({
      id, tenantId: tid, deviceId: opts.deviceId, patientDfn: opts.patientDfn,
      location: opts.location ?? null, facilityCode: opts.facilityCode ?? null,
      status: "active", associatedBy: opts.associatedBy, startedAt: assoc.startedAt,
    }).catch((e: unknown) => dbWarn("insertDevicePatientAssociation", e));
  }

  return assoc;
}

export function disassociatePatient(
  deviceId: string,
  actor: string = "system"
): boolean {
  let found = false;
  for (const [, assoc] of associations) {
    if (assoc.deviceId === deviceId && assoc.status === "active") {
      assoc.status = "ended";
      assoc.endedAt = now();
      found = true;
      const dev = devices.get(deviceId);
      appendAudit(
        deviceId,
        "disassociated",
        actor,
        { patientDfn: assoc.patientDfn },
        dev?.tenantId || DEFAULT_TENANT
      );
    }
  }
  return found;
}

export function getActiveAssociation(
  deviceId: string
): DevicePatientAssociation | undefined {
  for (const [, assoc] of associations) {
    if (assoc.deviceId === deviceId && assoc.status === "active") {
      return assoc;
    }
  }
  return undefined;
}

export function listAssociations(opts?: {
  deviceId?: string;
  patientDfn?: string;
  status?: AssociationStatus;
  tenantId?: string;
}): DevicePatientAssociation[] {
  let results = Array.from(associations.values());
  if (opts?.deviceId)
    results = results.filter((a) => a.deviceId === opts.deviceId);
  if (opts?.patientDfn)
    results = results.filter((a) => a.patientDfn === opts.patientDfn);
  if (opts?.status)
    results = results.filter((a) => a.status === opts.status);
  if (opts?.tenantId)
    results = results.filter((a) => a.tenantId === opts.tenantId);
  return results;
}

// ---------------------------------------------------------------------------
// Location Mapping
// ---------------------------------------------------------------------------

export function mapDeviceLocation(opts: {
  deviceId: string;
  ward: string;
  room: string;
  bed: string;
  facilityCode: string;
  tenantId?: string;
}): DeviceLocationMapping | { error: string } {
  const dev = devices.get(opts.deviceId);
  if (!dev) return { error: "device_not_found" };

  // Deactivate any existing location mapping for this device
  for (const [, m] of locationMappings) {
    if (m.deviceId === opts.deviceId && m.active) {
      m.active = false;
    }
  }

  const id = generateId("loc");
  const tid = opts.tenantId || dev.tenantId;
  const mapping: DeviceLocationMapping = {
    id,
    deviceId: opts.deviceId,
    ward: opts.ward,
    room: opts.room,
    bed: opts.bed,
    facilityCode: opts.facilityCode,
    active: true,
    tenantId: tid,
    mappedAt: now(),
  };

  locationMappings.set(id, mapping);
  appendAudit(
    opts.deviceId,
    "location_mapped",
    "system",
    { ward: opts.ward, room: opts.room, bed: opts.bed },
    tid
  );

  if (dbRepo) {
    dbRepo.insertDeviceLocationMapping({
      id, tenantId: tid, deviceId: opts.deviceId,
      facilityCode: opts.facilityCode, ward: opts.ward,
      room: opts.room, bed: opts.bed, active: true,
    }).catch((e: unknown) => dbWarn("insertDeviceLocationMapping", e));
  }

  return mapping;
}

export function getDeviceLocation(
  deviceId: string
): DeviceLocationMapping | undefined {
  for (const [, m] of locationMappings) {
    if (m.deviceId === deviceId && m.active) return m;
  }
  return undefined;
}

export function listLocationMappings(opts?: {
  ward?: string;
  facilityCode?: string;
  tenantId?: string;
}): DeviceLocationMapping[] {
  let results = Array.from(locationMappings.values()).filter((m) => m.active);
  if (opts?.ward) results = results.filter((m) => m.ward === opts.ward);
  if (opts?.facilityCode)
    results = results.filter((m) => m.facilityCode === opts.facilityCode);
  if (opts?.tenantId)
    results = results.filter((m) => m.tenantId === opts.tenantId);
  return results;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function getDeviceAudit(
  deviceId?: string,
  limit: number = 100
): DeviceAuditEntry[] {
  const filtered = deviceId
    ? auditLog.filter((e) => e.deviceId === deviceId)
    : auditLog;
  return filtered.slice(-limit);
}

// ---------------------------------------------------------------------------
// Store Stats
// ---------------------------------------------------------------------------

export function getRegistryStats(): {
  devices: number;
  associations: number;
  locationMappings: number;
  auditEntries: number;
} {
  return {
    devices: devices.size,
    associations: associations.size,
    locationMappings: locationMappings.size,
    auditEntries: auditLog.length,
  };
}
