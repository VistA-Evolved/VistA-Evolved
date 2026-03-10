/**
 * Device Registry -- Types
 *
 * Phase 380 (W21-P3): Managed device inventory with patient and location
 * association. Covers device lifecycle, association rules, and audit.
 *
 * A "device" here is a physical medical device (monitor, analyzer, pump)
 * that is connected via an edge gateway. This is distinct from the
 * imaging device registry in imaging-devices.ts (DICOM AE Titles).
 */

// ---------------------------------------------------------------------------
// Device Identity
// ---------------------------------------------------------------------------

export type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned';

export type DeviceClass =
  | 'monitor'
  | 'ventilator'
  | 'infusion_pump'
  | 'analyzer'
  | 'poct'
  | 'anesthesia'
  | 'dialysis'
  | 'imaging_modality'
  | 'other';

export interface ManagedDevice {
  /** Device ID (dev-XXXX) */
  id: string;
  /** Tenant scope */
  tenantId: string;
  /** Human-readable label */
  name: string;
  /** Manufacturer */
  manufacturer: string;
  /** Model number */
  model: string;
  /** Serial number (unique per tenant) */
  serialNumber: string;
  /** Device class */
  deviceClass: DeviceClass;
  /** Communication protocols this device supports */
  protocols: string[];
  /** Gateway this device is connected through */
  gatewayId?: string;
  /** Current status */
  status: DeviceStatus;
  /** Firmware version */
  firmwareVersion?: string;
  /** Calibration date (ISO 8601) */
  lastCalibration?: string;
  /** Next calibration due (ISO 8601) */
  nextCalibration?: string;
  /** Free-form metadata */
  metadata: Record<string, string>;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Patient Association
// ---------------------------------------------------------------------------

export type AssociationStatus = 'active' | 'ended';

export interface DevicePatientAssociation {
  /** Association ID */
  id: string;
  /** Device ID */
  deviceId: string;
  /** Patient DFN */
  patientDfn: string;
  /** Location (ward/bed) */
  location?: string;
  /** Facility code */
  facilityCode?: string;
  /** Association status */
  status: AssociationStatus;
  /** Who created the association (DUZ or system) */
  associatedBy: string;
  /** Start time */
  startedAt: string;
  /** End time (null if active) */
  endedAt?: string;
  /** Tenant scope */
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Location Mapping
// ---------------------------------------------------------------------------

export interface DeviceLocationMapping {
  /** Mapping ID */
  id: string;
  /** Device ID */
  deviceId: string;
  /** Ward/unit name */
  ward: string;
  /** Room number */
  room: string;
  /** Bed identifier */
  bed: string;
  /** Facility code */
  facilityCode: string;
  /** Active flag */
  active: boolean;
  /** Tenant scope */
  tenantId: string;
  /** Mapped timestamp */
  mappedAt: string;
}

// ---------------------------------------------------------------------------
// Device Audit Entry
// ---------------------------------------------------------------------------

export type DeviceAuditAction =
  | 'registered'
  | 'updated'
  | 'decommissioned'
  | 'associated'
  | 'disassociated'
  | 'location_mapped'
  | 'calibration_recorded'
  | 'status_changed';

export interface DeviceAuditEntry {
  id: string;
  deviceId: string;
  action: DeviceAuditAction;
  actor: string;
  detail: Record<string, unknown>;
  timestamp: string;
  tenantId: string;
}
