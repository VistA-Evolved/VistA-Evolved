/**
 * Edge Device Gateway + Device Registry — Barrel Export
 *
 * Phase 379 (W21-P2) + Phase 380 (W21-P3)
 */

export { default as edgeGatewayRoutes } from "./gateway-routes.js";
export { default as deviceRegistryRoutes } from "./device-registry-routes.js";
export { startGatewayCleanup, stopGatewayCleanup } from "./gateway-store.js";
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
} from "./types.js";
export type {
  ManagedDevice,
  DeviceStatus,
  DeviceClass,
  DevicePatientAssociation,
  DeviceLocationMapping,
  DeviceAuditEntry,
} from "./device-registry.types.js";
