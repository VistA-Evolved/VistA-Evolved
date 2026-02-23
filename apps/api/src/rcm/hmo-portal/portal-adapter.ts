/**
 * ManualAssistedAdapter — Base class for HMO Portal Adapters (Phase 97)
 *
 * In manual_assisted mode (Phase 97), the adapter:
 *   - Generates export files (JSON, text summary)
 *   - Provides deep links to the HMO provider portal
 *   - Provides step-by-step instructions for billing staff
 *   - Never touches actual credentials
 *
 * Each per-HMO adapter extends this class with:
 *   - Specific portal URLs and deep link templates
 *   - HMO-specific instructions (portal navigation steps)
 *   - Portal-specific field mapping notes
 *
 * Future: vault_automated mode will resolve credentials from VaultRef
 * and submit directly via portal API/RPA. That requires a separate
 * implementation per HMO and is NOT in scope for Phase 97.
 */

import type {
  PortalAdapter,
  PortalAdapterMode,
  PortalCapableHmoId,
  PortalSubmitResult,
  PortalStatusResult,
  PortalRemitResult,
  LoaPacket,
  HmoClaimPacket,
  VaultRef,
} from "./types.js";
import { generateLoaExports } from "./loa-engine.js";
import { exportHmoPacketJson, exportHmoPacketText } from "./hmo-packet-builder.js";

/* ── Manual Assisted Base ───────────────────────────────────── */

export interface ManualAdapterConfig {
  payerId: PortalCapableHmoId;
  adapterName: string;
  portalBaseUrl: string;
  loaDeepLink?: string;
  claimsDeepLink?: string;
  statusDeepLink?: string;
  remittanceDeepLink?: string;
  loaInstructions: string[];
  claimInstructions: string[];
  statusInstructions: string[];
  remittanceInstructions: string[];
}

export class ManualAssistedAdapter implements PortalAdapter {
  readonly payerId: PortalCapableHmoId;
  readonly adapterName: string;
  readonly mode: PortalAdapterMode = "manual_assisted";
  readonly portalBaseUrl: string;

  protected readonly config: ManualAdapterConfig;

  constructor(config: ManualAdapterConfig) {
    this.config = config;
    this.payerId = config.payerId;
    this.adapterName = config.adapterName;
    this.portalBaseUrl = config.portalBaseUrl;
  }

  async submitLOA(
    packet: LoaPacket,
    _vaultRef?: VaultRef,
  ): Promise<PortalSubmitResult> {
    const exports = generateLoaExports(packet, ["json", "pdf_text"]);

    return {
      ok: true,
      method: "manual_download",
      portalUrl: this.config.loaDeepLink ?? this.portalBaseUrl,
      instructions: [
        `1. Download the LOA packet files listed below.`,
        `2. Navigate to: ${this.config.loaDeepLink ?? this.portalBaseUrl}`,
        `3. Log in with your facility's provider portal credentials.`,
        ...this.config.loaInstructions.map((s, i) => `${i + 4}. ${s}`),
        `${this.config.loaInstructions.length + 4}. After submission, note the LOA reference number and update the submission record.`,
      ],
      exportFiles: exports.map((e) => ({
        filename: e.filename,
        format: e.format,
        sizeBytes: e.sizeBytes,
      })),
      trackingRef: `manual-loa-${packet.packetId}`,
    };
  }

  async submitClaim(
    packet: HmoClaimPacket,
    _vaultRef?: VaultRef,
  ): Promise<PortalSubmitResult> {
    const jsonExport = exportHmoPacketJson(packet);
    const textExport = exportHmoPacketText(packet);

    return {
      ok: true,
      method: "manual_download",
      portalUrl: this.config.claimsDeepLink ?? this.portalBaseUrl,
      instructions: [
        `1. Download the claim packet files listed below.`,
        `2. Navigate to: ${this.config.claimsDeepLink ?? this.portalBaseUrl}`,
        `3. Log in with your facility's provider portal credentials.`,
        ...this.config.claimInstructions.map((s, i) => `${i + 4}. ${s}`),
        `${this.config.claimInstructions.length + 4}. After submission, update the submission status to "claim_submitted_manual".`,
      ],
      exportFiles: [
        { filename: jsonExport.filename, format: "json", sizeBytes: jsonExport.sizeBytes },
        { filename: textExport.filename, format: "text", sizeBytes: textExport.sizeBytes },
      ],
      trackingRef: `manual-claim-${packet.packetId}`,
    };
  }

  async checkStatus(
    _claimId: string,
    _vaultRef?: VaultRef,
  ): Promise<PortalStatusResult> {
    return {
      ok: true,
      status: "unknown",
      checkedViaApi: false,
      checkedAt: new Date().toISOString(),
      message: [
        "Manual status check required.",
        ...this.config.statusInstructions,
        `Portal: ${this.config.statusDeepLink ?? this.portalBaseUrl}`,
      ].join(" "),
    };
  }

  async downloadRemit(
    _claimId: string,
    _vaultRef?: VaultRef,
  ): Promise<PortalRemitResult> {
    return {
      ok: true,
      available: false,
      method: "manual_download",
      portalUrl: this.config.remittanceDeepLink ?? this.portalBaseUrl,
      instructions: [
        `1. Navigate to: ${this.config.remittanceDeepLink ?? this.portalBaseUrl}`,
        `2. Log in with your facility's provider portal credentials.`,
        ...this.config.remittanceInstructions,
      ],
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; details: string }> {
    return {
      healthy: true,
      details: `${this.adapterName} adapter is in manual_assisted mode. Portal URL: ${this.portalBaseUrl}`,
    };
  }
}
