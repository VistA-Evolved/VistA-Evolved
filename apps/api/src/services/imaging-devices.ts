/**
 * Imaging Device Registry -- Phase 24.
 *
 * Manages DICOM device registrations (modalities, PACS nodes, etc.)
 * with AE title policy enforcement, IP/CIDR allowlists, and
 * TLS posture tracking.
 *
 * VistA-first: This is a platform-level device registry for DICOM
 * networking. VistA's own device management (if available via
 * MAG SYSTEM MANAGER options) would be the authoritative source.
 * This registry supplements VistA with modern DICOM networking
 * controls not present in classic VistA Imaging.
 *
 * Production migration: When enterprise PACS is available, this
 * registry feeds Orthanc's DicomModalities configuration and
 * network ACLs. For dcm4chee migration, map to dcm4chee AE
 * configuration REST API.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { log } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { imagingAudit } from "./imaging-audit.js";
import { hasImagingPermission } from "./imaging-authz.js";
import { safeErr } from "../lib/safe-error.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export type TlsMode = "off" | "optional" | "required";

export type DeviceStatus = "active" | "inactive" | "testing" | "decommissioned";

export interface DicomDevice {
  id: string;
  /** DICOM AE Title (must be unique, 1-16 chars, uppercase alphanumeric + underscore) */
  aeTitle: string;
  /** Modality type (CT, MR, US, CR, DX, NM, PT, XA, MG, etc.) */
  modalityType: string;
  /** Device description / model */
  description: string;
  /** Manufacturer */
  manufacturer: string;
  /** IP or CIDR allowlist for this device (e.g., ["192.168.1.100/32", "10.0.0.0/24"]) */
  ipAllowlist: string[];
  /** DICOM port on the device */
  dicomPort: number;
  /** Facility / site ID this device belongs to */
  facilityId: string;
  /** Facility name */
  facilityName: string;
  /** Tenant ID */
  tenantId: string;
  /** TLS mode for DICOM connections */
  tlsMode: TlsMode;
  /** Device status */
  status: DeviceStatus;
  /** Link to conformance statement (URL or file reference) */
  conformanceStatementUrl: string;
  /** Supported SOP Classes (from conformance statement) */
  supportedSopClasses: string[];
  /** Notes */
  notes: string;
  /** Created by DUZ */
  createdBy: string;
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Last C-ECHO success timestamp (null if never tested) */
  lastEchoAt: string | null;
  /** Last C-ECHO status */
  lastEchoStatus: "success" | "failure" | "unknown";
}

export interface CreateDeviceInput {
  aeTitle: string;
  modalityType: string;
  description?: string;
  manufacturer?: string;
  ipAllowlist?: string[];
  dicomPort?: number;
  facilityId?: string;
  facilityName?: string;
  tlsMode?: TlsMode;
  conformanceStatementUrl?: string;
  supportedSopClasses?: string[];
  notes?: string;
}

/* ================================================================== */
/* Validation                                                           */
/* ================================================================== */

/** AE Title: 1-16 chars, uppercase alphanumeric + underscore + space. */
const AE_TITLE_REGEX = /^[A-Z0-9_ ]{1,16}$/;

/** CIDR: IPv4 with optional mask. */
const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

const VALID_MODALITIES = new Set([
  "CT", "MR", "US", "CR", "DX", "NM", "PT", "XA", "MG", "RF",
  "OT", "SC", "SR", "KO", "PR", "SEG", "REG", "RTPLAN", "RTDOSE",
  "RTSTRUCT", "IO", "GM", "SM", "XC", "ES", "ECG",
]);

const VALID_TLS_MODES = new Set<TlsMode>(["off", "optional", "required"]);

function validateDevice(input: CreateDeviceInput): string | null {
  if (!input.aeTitle || !AE_TITLE_REGEX.test(input.aeTitle.toUpperCase())) {
    return "AE Title must be 1-16 characters, uppercase alphanumeric/underscore/space";
  }
  if (!input.modalityType || !VALID_MODALITIES.has(input.modalityType.toUpperCase())) {
    return `Invalid modality type. Valid: ${Array.from(VALID_MODALITIES).sort().join(", ")}`;
  }
  if (input.ipAllowlist) {
    for (const cidr of input.ipAllowlist) {
      if (!CIDR_REGEX.test(cidr)) {
        return `Invalid CIDR in allowlist: ${cidr}. Expected format: x.x.x.x or x.x.x.x/nn`;
      }
    }
  }
  if (input.tlsMode && !VALID_TLS_MODES.has(input.tlsMode)) {
    return `Invalid TLS mode. Valid: off, optional, required`;
  }
  if (input.dicomPort !== undefined && (input.dicomPort < 1 || input.dicomPort > 65535)) {
    return "DICOM port must be 1-65535";
  }
  return null;
}

/* ================================================================== */
/* In-memory store                                                      */
/* ================================================================== */

const deviceStore = new Map<string, DicomDevice>();

/** AE Title -> device ID index for uniqueness. */
const aeTitleIndex = new Map<string, string>();

/* Phase 146: DB repo wiring */
let deviceDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initImagingDeviceStoreRepo(repo: typeof deviceDbRepo): void { deviceDbRepo = repo; }

export function getDevice(id: string): DicomDevice | undefined {
  return deviceStore.get(id);
}

export function getDeviceByAeTitle(aeTitle: string): DicomDevice | undefined {
  const id = aeTitleIndex.get(aeTitle.toUpperCase());
  return id ? deviceStore.get(id) : undefined;
}

export function getAllDevices(filters?: {
  facilityId?: string;
  tenantId?: string;
  modalityType?: string;
  status?: DeviceStatus;
}): DicomDevice[] {
  let devices = Array.from(deviceStore.values());
  if (filters?.facilityId) devices = devices.filter((d) => d.facilityId === filters.facilityId);
  if (filters?.tenantId) devices = devices.filter((d) => d.tenantId === filters.tenantId);
  if (filters?.modalityType) devices = devices.filter((d) => d.modalityType === filters.modalityType);
  if (filters?.status) devices = devices.filter((d) => d.status === filters.status);
  return devices.sort((a, b) => a.aeTitle.localeCompare(b.aeTitle));
}

/**
 * Get devices for a specific facility (used for AE allowlist checks).
 */
export function getDevicesForFacility(facilityId: string): DicomDevice[] {
  return Array.from(deviceStore.values()).filter((d) => d.facilityId === facilityId && d.status === "active");
}

/* ================================================================== */
/* Routes                                                               */
/* ================================================================== */

export async function imagingDeviceRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /imaging/devices
   * List all registered DICOM devices (imaging_admin required).
   */
  server.get("/imaging/devices", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const q = request.query as {
      facilityId?: string;
      modalityType?: string;
      status?: string;
    };

    const devices = getAllDevices({
      facilityId: q.facilityId,
      tenantId: session.tenantId,
      modalityType: q.modalityType?.toUpperCase(),
      status: q.status as DeviceStatus,
    });

    return { ok: true, count: devices.length, devices };
  });

  /**
   * GET /imaging/devices/:id
   * Get a single device by ID.
   */
  server.get("/imaging/devices/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const { id } = request.params as { id: string };
    const device = getDevice(id);
    if (!device) return reply.code(404).send({ ok: false, error: "Device not found" });

    return { ok: true, device };
  });

  /**
   * POST /imaging/devices
   * Register a new DICOM device.
   */
  server.post("/imaging/devices", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const input = request.body as CreateDeviceInput | null;
    if (!input) return reply.code(400).send({ ok: false, error: "Request body required" });

    const validationError = validateDevice(input);
    if (validationError) return reply.code(400).send({ ok: false, error: validationError });

    const normalizedAe = input.aeTitle.toUpperCase().trim();

    // Check AE Title uniqueness
    if (aeTitleIndex.has(normalizedAe)) {
      return reply.code(409).send({
        ok: false,
        error: `AE Title '${normalizedAe}' already registered`,
        existingDeviceId: aeTitleIndex.get(normalizedAe),
      });
    }

    const now = new Date().toISOString();
    const device: DicomDevice = {
      id: randomUUID(),
      aeTitle: normalizedAe,
      modalityType: input.modalityType.toUpperCase(),
      description: input.description || "",
      manufacturer: input.manufacturer || "",
      ipAllowlist: input.ipAllowlist || [],
      dicomPort: input.dicomPort || 104,
      facilityId: input.facilityId || session.facilityStation,
      facilityName: input.facilityName || session.facilityName,
      tenantId: session.tenantId,
      tlsMode: input.tlsMode || "off",
      status: "testing",
      conformanceStatementUrl: input.conformanceStatementUrl || "",
      supportedSopClasses: input.supportedSopClasses || [],
      notes: input.notes || "",
      createdBy: session.duz,
      createdAt: now,
      updatedAt: now,
      lastEchoAt: null,
      lastEchoStatus: "unknown",
    };

    deviceStore.set(device.id, device);
    aeTitleIndex.set(normalizedAe, device.id);

    // Phase 146: Write-through to PG
    deviceDbRepo?.upsert({ id: device.id, tenantId: device.tenantId, aeTitle: device.aeTitle, name: device.description, type: device.modalityType, status: device.status, facilityId: device.facilityId, host: device.ipAllowlist?.[0] ?? '', port: device.dicomPort, createdAt: device.createdAt, updatedAt: device.updatedAt }).catch((e) => log.warn('PG write-through failed', { error: String(e) }));

    log.info("DICOM device registered", {
      deviceId: device.id, aeTitle: device.aeTitle, modality: device.modalityType,
    });
    audit("integration.device-onboard", "success", {
      duz: session.duz, name: session.userName, role: session.role,
    }, {
      sourceIp: request.ip,
      detail: { deviceId: device.id, aeTitle: device.aeTitle, modality: device.modalityType },
    });
    imagingAudit("DEVICE_REGISTER", {
      duz: session.duz, name: session.userName, role: session.role,
    }, session.tenantId, {
      sourceIp: request.ip,
      detail: { deviceId: device.id, aeTitle: device.aeTitle, facilityId: device.facilityId },
    });

    return reply.code(201).send({ ok: true, device });
  });

  /**
   * PATCH /imaging/devices/:id
   * Update a device.
   */
  server.patch("/imaging/devices/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const { id } = request.params as { id: string };
    const device = deviceStore.get(id);
    if (!device) return reply.code(404).send({ ok: false, error: "Device not found" });

    const body = request.body as Partial<CreateDeviceInput> & { status?: DeviceStatus } | null;
    if (!body) return reply.code(400).send({ ok: false, error: "Request body required" });

    // If changing AE Title, check uniqueness
    if (body.aeTitle) {
      const normalizedAe = body.aeTitle.toUpperCase().trim();
      if (!AE_TITLE_REGEX.test(normalizedAe)) {
        return reply.code(400).send({ ok: false, error: "Invalid AE Title format" });
      }
      if (normalizedAe !== device.aeTitle && aeTitleIndex.has(normalizedAe)) {
        return reply.code(409).send({ ok: false, error: `AE Title '${normalizedAe}' already registered` });
      }
      // Update index
      aeTitleIndex.delete(device.aeTitle);
      device.aeTitle = normalizedAe;
      aeTitleIndex.set(normalizedAe, device.id);
    }

    if (body.modalityType) device.modalityType = body.modalityType.toUpperCase();
    if (body.description !== undefined) device.description = body.description;
    if (body.manufacturer !== undefined) device.manufacturer = body.manufacturer;
    if (body.ipAllowlist) {
      for (const cidr of body.ipAllowlist) {
        if (!CIDR_REGEX.test(cidr)) {
          return reply.code(400).send({ ok: false, error: `Invalid CIDR: ${cidr}` });
        }
      }
      device.ipAllowlist = body.ipAllowlist;
    }
    if (body.dicomPort !== undefined) device.dicomPort = body.dicomPort;
    if (body.facilityId !== undefined) device.facilityId = body.facilityId;
    if (body.facilityName !== undefined) device.facilityName = body.facilityName;
    if (body.tlsMode !== undefined) device.tlsMode = body.tlsMode;
    if (body.status !== undefined) device.status = body.status;
    if (body.conformanceStatementUrl !== undefined) device.conformanceStatementUrl = body.conformanceStatementUrl;
    if (body.supportedSopClasses !== undefined) device.supportedSopClasses = body.supportedSopClasses;
    if (body.notes !== undefined) device.notes = body.notes;

    device.updatedAt = new Date().toISOString();

    imagingAudit("DEVICE_UPDATE", {
      duz: session.duz, name: session.userName, role: session.role,
    }, session.tenantId, {
      sourceIp: request.ip,
      detail: { deviceId: device.id, aeTitle: device.aeTitle, changes: Object.keys(body) },
    });

    return { ok: true, device };
  });

  /**
   * DELETE /imaging/devices/:id
   * Remove a device (soft: marks decommissioned).
   */
  server.delete("/imaging/devices/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const { id } = request.params as { id: string };
    const device = deviceStore.get(id);
    if (!device) return reply.code(404).send({ ok: false, error: "Device not found" });

    // Soft delete: mark decommissioned + free AE Title for re-registration (BUG-040)
    device.status = "decommissioned";
    device.updatedAt = new Date().toISOString();
    aeTitleIndex.delete(device.aeTitle);

    imagingAudit("DEVICE_DELETE", {
      duz: session.duz, name: session.userName, role: session.role,
    }, session.tenantId, {
      sourceIp: request.ip,
      detail: { deviceId: device.id, aeTitle: device.aeTitle },
    });

    log.info("DICOM device decommissioned", { deviceId: device.id, aeTitle: device.aeTitle });

    return { ok: true, message: `Device ${device.aeTitle} decommissioned`, device };
  });

  /**
   * POST /imaging/devices/:id/echo
   * Trigger a C-ECHO test to Orthanc for this device.
   * (Orthanc-side: uses REST API to verify connectivity.)
   */
  server.post("/imaging/devices/:id/echo", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: "Authentication required" });
    if (!hasImagingPermission(session, "imaging_admin")) {
      return reply.code(403).send({ ok: false, error: "Imaging admin required" });
    }

    const { id } = request.params as { id: string };
    const device = deviceStore.get(id);
    if (!device) return reply.code(404).send({ ok: false, error: "Device not found" });

    // If device is registered in Orthanc as a modality, we can test via REST API
    const orthancUrl = process.env.ORTHANC_URL || "http://localhost:8042";
    try {
      const echoRes = await fetch(`${orthancUrl}/modalities/${device.aeTitle}/echo`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });

      if (echoRes.ok) {
        device.lastEchoAt = new Date().toISOString();
        device.lastEchoStatus = "success";
        return { ok: true, echoStatus: "success", aeTitle: device.aeTitle };
      } else {
        device.lastEchoStatus = "failure";
        const errText = await echoRes.text().catch(() => "");
        return {
          ok: false,
          echoStatus: "failure",
          aeTitle: device.aeTitle,
          error: `Orthanc echo failed: ${echoRes.status}`,
          detail: errText.slice(0, 200),
        };
      }
    } catch (err) {
      device.lastEchoStatus = "failure";
      return {
        ok: false,
        echoStatus: "error",
        aeTitle: device.aeTitle,
        error: `Echo test failed: ${safeErr(err)}`,
      };
    }
  });
}
