/**
 * Edge Device Gateway — Barrel Export
 *
 * Phase 379 (W21-P2)
 */

export { default as edgeGatewayRoutes } from "./gateway-routes.js";
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
