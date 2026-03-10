/**
 * Edge Device Gateway + Device Registry -- Barrel Export
 *
 * Phase 379 (W21-P2) + Phase 380 (W21-P3)
 */

export { default as edgeGatewayRoutes } from './gateway-routes.js';
export { default as deviceRegistryRoutes } from './device-registry-routes.js';
export { default as hl7v2IngestRoutes } from './hl7v2-ingest-routes.js';
export { default as astmPoct1aIngestRoutes } from './astm-poct1a-ingest-routes.js';
export { default as sdcIngestRoutes } from './sdc-ingest-routes.js';
export { default as alarmRoutes } from './alarm-routes.js';
export { default as infusionBcmaRoutes } from './infusion-bcma-routes.js';
export { default as imagingModalityRoutes } from './imaging-modality-routes.js';
export { default as normalizationRoutes } from './normalization-routes.js';
export { startGatewayCleanup, stopGatewayCleanup } from './gateway-store.js';
export {
  processObservation,
  processObservationBatch,
  getPipelineStats,
  resetPipelineStats,
} from './device-observation-pipeline.js';
export type {
  EdgeGateway,
  GatewayStatus,
  GatewayConfig,
  UplinkEnvelope,
  UplinkMessageType,
  DeviceObservation,
  GatewayHealthSnapshot,
  DownlinkMessage,
  GatewayCertInfo,
} from './types.js';
export type {
  ManagedDevice,
  DeviceStatus,
  DeviceClass,
  DevicePatientAssociation,
  DeviceLocationMapping,
  DeviceAuditEntry,
} from './device-registry.types.js';
