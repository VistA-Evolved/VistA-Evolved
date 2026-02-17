/**
 * Integration Registry — Phase 18A.
 *
 * Central registry for all enterprise integrations: VistA RPC, FHIR endpoints,
 * imaging systems (PACS/VNA/DICOM), HL7v2 feeds, lab systems, and devices.
 *
 * Each integration entry describes a connection target with:
 *   - Type classification (vista-rpc, fhir, fhir-c0fhir, dicom, dicomweb,
 *     hl7v2, lis, pacs-vna, device, external)
 *   - Connection details (host, port, path, auth)
 *   - Health monitoring (status, last check, error log)
 *   - Queue metrics (pending, processed, errors)
 *
 * VistA-first: uses known RPCs (MAG4 REMOTE PROCEDURE, RA DETAILED REPORT,
 *   C0FHIR GET FULL BUNDLE, VPR GET PATIENT DATA JSON) when available.
 *
 * VistA HL7 binding:
 *   The `hl7v2` type currently probes TCP connectivity only. Ground-truth
 *   HL7 link status lives in VistA file #870 (HL LOGICAL LINK). Future
 *   work will add RPCs to read #870, #772, #773, #776, and #779.x for
 *   real-time HL7 engine monitoring. See docs/interop-grounding.md.
 *
 * Config-not-code: devices and modalities are configured entries, not
 *   hard-coded. New devices are onboarded via admin API.
 *
 * References:
 *   - WorldVistA/VistA-FHIR-Server: C0FHIR Suite — FHIR R4 via RPC
 *   - WorldVistA/FHIR-on-VistA: M REST + HAPI FHIR translation layer
 *   - WorldVistA/lighthouse-charon: REST → VistA RPC bridge
 *   - VistA-M/Packages/Imaging: MAG* namespace (MAG*3.0*235)
 *   - Orthanc, OHIF, dcm4chee for open DICOM/DICOMweb
 */

/* ------------------------------------------------------------------ */
/* Integration Types                                                    */
/* ------------------------------------------------------------------ */

/** All supported integration types. */
export type IntegrationType =
  | "vista-rpc"        // Direct XWB RPC Broker connection
  | "fhir"            // Generic FHIR R4 endpoint
  | "fhir-c0fhir"     // WorldVistA C0FHIR Suite (RPC-backed FHIR)
  | "fhir-vpr"        // VPR GET PATIENT DATA JSON → FHIR transform
  | "dicom"           // Raw DICOM (C-STORE/C-FIND/C-MOVE)
  | "dicomweb"        // DICOMweb (WADO-RS, STOW-RS, QIDO-RS)
  | "hl7v2"           // HL7v2 MLLP feeds (ADT, ORM, ORU)
  | "lis"             // Lab Information System interface
  | "pacs-vna"        // PACS/VNA archive
  | "device"          // Modality / bedside device
  | "external";       // Other external system

/** Authentication methods for integrations. */
export type IntegrationAuthMethod =
  | "none"
  | "basic"
  | "bearer"
  | "certificate"
  | "vista-av-codes"
  | "api-key";

/** Integration health status. */
export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "degraded"
  | "unknown"
  | "disabled";

/** A single error log entry. */
export interface IntegrationErrorEntry {
  timestamp: string;
  code: string;
  message: string;
  detail?: string;
}

/** Queue metrics for an integration. */
export interface IntegrationQueueMetrics {
  pending: number;
  processed: number;
  errors: number;
  lastProcessed: string | null;
  avgLatencyMs: number;
}

/* ------------------------------------------------------------------ */
/* Integration Entry                                                    */
/* ------------------------------------------------------------------ */

/** A single integration entry in the registry. */
export interface IntegrationEntry {
  /** Unique ID (e.g., "vista-primary", "orthanc-1", "fhir-c0fhir") */
  id: string;
  /** Human-readable label */
  label: string;
  /** Integration type */
  type: IntegrationType;
  /** Whether this integration is enabled (admin toggle) */
  enabled: boolean;
  /** Connection host/IP */
  host: string;
  /** Connection port */
  port: number;
  /** URL path (for HTTP-based integrations, e.g., "/fhir") */
  basePath: string;
  /** Authentication method */
  authMethod: IntegrationAuthMethod;
  /** Health status */
  status: IntegrationStatus;
  /** Last health check timestamp (ISO) */
  lastChecked: string | null;
  /** Last successful communication (ISO) */
  lastSuccess: string | null;
  /** Last error (ISO timestamp) */
  lastError: string | null;
  /** Recent error log (ring buffer, max 20) */
  errorLog: IntegrationErrorEntry[];
  /** Queue metrics */
  queueMetrics: IntegrationQueueMetrics;
  /** Type-specific configuration (see discriminated configs below) */
  config: IntegrationSpecificConfig;
  /** Notes / description */
  notes: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Type-specific configs                                                */
/* ------------------------------------------------------------------ */

/** VistA RPC-specific config. */
export interface VistaRpcConfig {
  kind: "vista-rpc";
  /** RPC context (e.g., "OR CPRS GUI CHART") */
  context: string;
  /** Whether to use XWB protocol v1.1 */
  xwbVersion: string;
}

/** C0FHIR Suite config (WorldVistA VistA-FHIR-Server). */
export interface FhirC0FhirConfig {
  kind: "fhir-c0fhir";
  /** FHIR endpoint path (typically "/fhir") */
  fhirEndpoint: string;
  /** The RPC name used behind the scenes */
  rpcName: string;
  /** RPC context for C0FHIR */
  rpcContext: string;
  /** FHIR version (R4) */
  fhirVersion: string;
}

/** Generic FHIR endpoint config. */
export interface FhirConfig {
  kind: "fhir";
  /** FHIR base URL path */
  fhirEndpoint: string;
  /** FHIR version */
  fhirVersion: string;
  /** Supported resource types */
  supportedResources: string[];
}

/** VPR-based FHIR config. */
export interface FhirVprConfig {
  kind: "fhir-vpr";
  /** The VPR RPC name */
  rpcName: string;
  /** VPR data categories */
  categories: string[];
}

/** DICOM config (raw C-STORE/C-FIND). */
export interface DicomConfig {
  kind: "dicom";
  /** Application Entity Title */
  aeTitle: string;
  /** Called AE Title */
  calledAeTitle: string;
  /** Supported SOP classes */
  sopClasses: string[];
}

/** DICOMweb config (WADO-RS, STOW-RS, QIDO-RS). */
export interface DicomWebConfig {
  kind: "dicomweb";
  /** WADO-RS endpoint path */
  wadoRsPath: string;
  /** STOW-RS endpoint path */
  stowRsPath: string;
  /** QIDO-RS endpoint path */
  qidoRsPath: string;
}

/** HL7v2 MLLP config. */
export interface Hl7v2Config {
  kind: "hl7v2";
  /** Message types handled (e.g., ["ADT", "ORM", "ORU"]) */
  messageTypes: string[];
  /** MLLP version */
  mllpVersion: string;
  /** Sending facility */
  sendingFacility: string;
  /** Receiving facility */
  receivingFacility: string;
}

/** Lab Information System config. */
export interface LisConfig {
  kind: "lis";
  /** LIS vendor name */
  vendor: string;
  /** Interface type (e.g., "hl7", "astm", "poct1a") */
  interfaceType: string;
  /** Supported test panels */
  testPanels: string[];
}

/** PACS/VNA config. */
export interface PacsVnaConfig {
  kind: "pacs-vna";
  /** Vendor name */
  vendor: string;
  /** Whether it supports DICOMweb */
  supportsDicomWeb: boolean;
  /** OHIF viewer URL template (use {studyUID} placeholder) */
  viewerUrlTemplate: string;
  /** AE Title for PACS */
  aeTitle: string;
}

/** Device / modality config. */
export interface DeviceConfig {
  kind: "device";
  /** Device manufacturer */
  manufacturer: string;
  /** Device model */
  model: string;
  /** Serial number */
  serialNumber: string;
  /** Modality code (e.g., "CT", "MR", "US", "XR", "CR", "ECG") */
  modalityCode: string;
  /** AE Title (for DICOM modalities) */
  aeTitle: string;
  /** Location / room */
  location: string;
  /** Worklist endpoint (if applicable) */
  worklistAeTitle: string;
  /** Conformance classes supported */
  conformanceClasses: string[];
}

/** External system config (catch-all). */
export interface ExternalConfig {
  kind: "external";
  /** Arbitrary key-value settings */
  settings: Record<string, string>;
}

/** Union of all type-specific configs. */
export type IntegrationSpecificConfig =
  | VistaRpcConfig
  | FhirC0FhirConfig
  | FhirConfig
  | FhirVprConfig
  | DicomConfig
  | DicomWebConfig
  | Hl7v2Config
  | LisConfig
  | PacsVnaConfig
  | DeviceConfig
  | ExternalConfig;

/* ------------------------------------------------------------------ */
/* In-memory registry store (per tenant)                                */
/* ------------------------------------------------------------------ */

/**
 * Map of tenantId → Map of integrationId → IntegrationEntry.
 * Production would use a database or config service.
 */
const registryStore = new Map<string, Map<string, IntegrationEntry>>();

/** Error-log ring buffer size per integration. */
const MAX_ERROR_LOG = 20;

/* ------------------------------------------------------------------ */
/* Helper: create empty queue metrics                                   */
/* ------------------------------------------------------------------ */

function emptyQueueMetrics(): IntegrationQueueMetrics {
  return { pending: 0, processed: 0, errors: 0, lastProcessed: null, avgLatencyMs: 0 };
}

/* ------------------------------------------------------------------ */
/* Seed default integrations for a tenant                               */
/* ------------------------------------------------------------------ */

/**
 * Build the default integrations for the "default" tenant.
 * Seeds the VistA-RPC primary connection and optional C0FHIR if configured.
 */
export function seedDefaultIntegrations(tenantId: string): void {
  const map = new Map<string, IntegrationEntry>();
  const now = new Date().toISOString();

  // 1. Primary VistA RPC connection
  map.set("vista-primary", {
    id: "vista-primary",
    label: "Primary VistA RPC Broker",
    type: "vista-rpc",
    enabled: true,
    host: process.env.VISTA_HOST || "127.0.0.1",
    port: Number(process.env.VISTA_PORT || 9430),
    basePath: "",
    authMethod: "vista-av-codes",
    status: "unknown",
    lastChecked: null,
    lastSuccess: null,
    lastError: null,
    errorLog: [],
    queueMetrics: emptyQueueMetrics(),
    config: {
      kind: "vista-rpc",
      context: process.env.VISTA_CONTEXT || "OR CPRS GUI CHART",
      xwbVersion: "1.1",
    },
    notes: "Default VistA RPC Broker connection (WorldVistA Docker sandbox)",
    createdAt: now,
    updatedAt: now,
  });

  // 2. C0FHIR Suite (if host is configured)
  const c0fhirHost = process.env.C0FHIR_HOST;
  if (c0fhirHost) {
    map.set("fhir-c0fhir", {
      id: "fhir-c0fhir",
      label: "C0FHIR Suite (FHIR R4)",
      type: "fhir-c0fhir",
      enabled: true,
      host: c0fhirHost,
      port: Number(process.env.C0FHIR_PORT || 9080),
      basePath: "/fhir",
      authMethod: "none",
      status: "unknown",
      lastChecked: null,
      lastSuccess: null,
      lastError: null,
      errorLog: [],
      queueMetrics: emptyQueueMetrics(),
      config: {
        kind: "fhir-c0fhir",
        fhirEndpoint: "/fhir",
        rpcName: "C0FHIR GET FULL BUNDLE",
        rpcContext: "C0FHIR CONTEXT",
        fhirVersion: "R4",
      },
      notes: "WorldVistA C0FHIR Suite — MUMPS-native FHIR R4 endpoint backed by RPC",
      createdAt: now,
      updatedAt: now,
    });
  }

  // 3. VistA Imaging (placeholder — detects MAG4 REMOTE PROCEDURE)
  map.set("vista-imaging", {
    id: "vista-imaging",
    label: "VistA Imaging (MAG4)",
    type: "pacs-vna",
    enabled: true,
    host: process.env.VISTA_HOST || "127.0.0.1",
    port: Number(process.env.VISTA_PORT || 9430),
    basePath: "",
    authMethod: "vista-av-codes",
    status: "unknown",
    lastChecked: null,
    lastSuccess: null,
    lastError: null,
    errorLog: [],
    queueMetrics: emptyQueueMetrics(),
    config: {
      kind: "pacs-vna",
      vendor: "VistA Imaging",
      supportsDicomWeb: false,
      viewerUrlTemplate: "",
      aeTitle: "",
    },
    notes: "VistA Imaging integration via MAG4 REMOTE PROCEDURE and RA DETAILED REPORT RPCs",
    createdAt: now,
    updatedAt: now,
  });

  registryStore.set(tenantId, map);
}

// Seed default on module load
seedDefaultIntegrations("default");

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/** Ensure a tenant registry map exists (lazy init for non-default tenants). */
function ensureTenant(tenantId: string): Map<string, IntegrationEntry> {
  let map = registryStore.get(tenantId);
  if (!map) {
    map = new Map();
    registryStore.set(tenantId, map);
  }
  return map;
}

/** List all integrations for a tenant. */
export function listIntegrations(tenantId: string): IntegrationEntry[] {
  const map = registryStore.get(tenantId);
  return map ? Array.from(map.values()) : [];
}

/** Get a single integration by ID. */
export function getIntegration(tenantId: string, integrationId: string): IntegrationEntry | null {
  return registryStore.get(tenantId)?.get(integrationId) ?? null;
}

/** Create or update an integration entry. */
export function upsertIntegration(tenantId: string, entry: IntegrationEntry): IntegrationEntry {
  const map = ensureTenant(tenantId);
  entry.updatedAt = new Date().toISOString();
  if (!entry.createdAt) entry.createdAt = entry.updatedAt;
  map.set(entry.id, entry);
  return entry;
}

/** Delete an integration entry. */
export function deleteIntegration(tenantId: string, integrationId: string): boolean {
  const map = registryStore.get(tenantId);
  if (!map) return false;
  return map.delete(integrationId);
}

/** Enable or disable an integration. */
export function toggleIntegration(tenantId: string, integrationId: string, enabled: boolean): IntegrationEntry | null {
  const entry = getIntegration(tenantId, integrationId);
  if (!entry) return null;
  entry.enabled = enabled;
  entry.status = enabled ? "unknown" : "disabled";
  entry.updatedAt = new Date().toISOString();
  return entry;
}

/** Update integration health status. */
export function updateIntegrationStatus(
  tenantId: string,
  integrationId: string,
  status: IntegrationStatus,
  errorMsg?: string,
): IntegrationEntry | null {
  const entry = getIntegration(tenantId, integrationId);
  if (!entry) return null;

  entry.status = status;
  entry.lastChecked = new Date().toISOString();

  if (status === "connected") {
    entry.lastSuccess = entry.lastChecked;
  }

  if (errorMsg) {
    entry.lastError = entry.lastChecked;
    entry.errorLog.push({
      timestamp: entry.lastChecked,
      code: status === "disconnected" ? "CONNECTION_FAILED" : "DEGRADED",
      message: errorMsg,
    });
    // Ring buffer
    while (entry.errorLog.length > MAX_ERROR_LOG) {
      entry.errorLog.shift();
    }
  }

  entry.updatedAt = entry.lastChecked;
  return entry;
}

/** Update queue metrics for an integration. */
export function updateQueueMetrics(
  tenantId: string,
  integrationId: string,
  metrics: Partial<IntegrationQueueMetrics>,
): IntegrationEntry | null {
  const entry = getIntegration(tenantId, integrationId);
  if (!entry) return null;
  entry.queueMetrics = { ...entry.queueMetrics, ...metrics };
  entry.updatedAt = new Date().toISOString();
  return entry;
}

/** Record an error event for an integration. */
export function recordIntegrationError(
  tenantId: string,
  integrationId: string,
  code: string,
  message: string,
  detail?: string,
): void {
  const entry = getIntegration(tenantId, integrationId);
  if (!entry) return;
  const now = new Date().toISOString();
  entry.errorLog.push({ timestamp: now, code, message, detail });
  while (entry.errorLog.length > MAX_ERROR_LOG) {
    entry.errorLog.shift();
  }
  entry.lastError = now;
  entry.queueMetrics.errors++;
  entry.updatedAt = now;
}

/* ------------------------------------------------------------------ */
/* Integration health summary (for metrics endpoint)                    */
/* ------------------------------------------------------------------ */

export interface IntegrationHealthSummary {
  total: number;
  enabled: number;
  connected: number;
  disconnected: number;
  degraded: number;
  unknown: number;
  disabled: number;
  byType: Record<string, number>;
  entries: Array<{
    id: string;
    label: string;
    type: IntegrationType;
    enabled: boolean;
    status: IntegrationStatus;
    lastChecked: string | null;
    errorCount: number;
    queuePending: number;
  }>;
}

/** Generate a health summary across all integrations for a tenant. */
export function getIntegrationHealthSummary(tenantId: string): IntegrationHealthSummary {
  const entries = listIntegrations(tenantId);
  const summary: IntegrationHealthSummary = {
    total: entries.length,
    enabled: 0,
    connected: 0,
    disconnected: 0,
    degraded: 0,
    unknown: 0,
    disabled: 0,
    byType: {},
    entries: [],
  };

  for (const e of entries) {
    if (e.enabled) summary.enabled++;
    switch (e.status) {
      case "connected": summary.connected++; break;
      case "disconnected": summary.disconnected++; break;
      case "degraded": summary.degraded++; break;
      case "disabled": summary.disabled++; break;
      default: summary.unknown++; break;
    }
    summary.byType[e.type] = (summary.byType[e.type] || 0) + 1;
    summary.entries.push({
      id: e.id,
      label: e.label,
      type: e.type,
      enabled: e.enabled,
      status: e.status,
      lastChecked: e.lastChecked,
      errorCount: e.errorLog.length,
      queuePending: e.queueMetrics.pending,
    });
  }

  return summary;
}

/* ------------------------------------------------------------------ */
/* Integration type labels (UI helper)                                  */
/* ------------------------------------------------------------------ */

export const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  "vista-rpc": "VistA RPC Broker",
  "fhir": "FHIR R4 Endpoint",
  "fhir-c0fhir": "C0FHIR Suite (FHIR R4)",
  "fhir-vpr": "VPR → FHIR",
  "dicom": "DICOM (C-STORE/C-FIND)",
  "dicomweb": "DICOMweb (WADO/STOW/QIDO)",
  "hl7v2": "HL7v2 MLLP",
  "lis": "Lab Information System",
  "pacs-vna": "PACS / VNA",
  "device": "Device / Modality",
  "external": "External System",
};
