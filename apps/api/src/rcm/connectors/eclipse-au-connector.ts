/**
 * AU ECLIPSE Connector — Australian Medicare/DVA Claims Gateway
 *
 * Phase 40 (Superseding): Integration-ready connector for ECLIPSE.
 * ECLIPSE = Electronic Claim Lodgement and Information Processing Service Environment.
 * Operated by Services Australia for Medicare + DVA claiming.
 *
 * Supports:
 *   - Medicare bulk-bill and patient claims
 *   - DVA claims (Gold/White card)
 *   - Medicare benefit enquiry (eligibility)
 *   - Claim status enquiry
 *
 * Authentication: PRODA (Provider Digital Access) + PKI certificates.
 * Format: HL7v2 / proprietary XML over HTTPS (not X12).
 *
 * Status: Integration-ready stub. Configure:
 *   ECLIPSE_API_ENDPOINT, ECLIPSE_PRODA_ORG_ID, ECLIPSE_DEVICE_NAME, ECLIPSE_CERT_PATH
 */

import type { RcmConnector, ConnectorResult } from "./types.js";
import type { X12TransactionSet } from "../edi/types.js";

export class EclipseAuConnector implements RcmConnector {
  readonly id = "eclipse-au";
  readonly name = "ECLIPSE (Services Australia Medicare/DVA Gateway)";
  readonly supportedModes = ["government_portal"];
  readonly supportedTransactions: X12TransactionSet[] = [
    "837P", "837I", "270", "271", "276", "277",
  ]; // Note: AU uses different wire format but maps to same logical transactions

  private configured = false;
  private config = {
    apiEndpoint: process.env.ECLIPSE_API_ENDPOINT ?? "https://proda.humanservices.gov.au",
    prodaOrgId: process.env.ECLIPSE_PRODA_ORG_ID ?? "",
    deviceName: process.env.ECLIPSE_DEVICE_NAME ?? "",
    certPath: process.env.ECLIPSE_CERT_PATH ?? "",
  };

  async initialize(): Promise<void> {
    this.configured = !!(this.config.prodaOrgId && this.config.certPath);
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>,
  ): Promise<ConnectorResult> {
    if (!this.configured) {
      return {
        success: false,
        errors: [{
          code: "ECLIPSE-NOT-CONFIGURED",
          description: "ECLIPSE connector not configured. Requires PRODA organisation registration + PKI device certificate. See: https://www.servicesaustralia.gov.au/proda",
          severity: "error",
        }],
        metadata: {
          targetSystem: "ECLIPSE (Services Australia)",
          enrollmentUrl: "https://www.servicesaustralia.gov.au/proda",
          requiredEnvVars: "ECLIPSE_PRODA_ORG_ID,ECLIPSE_DEVICE_NAME,ECLIPSE_CERT_PATH",
          wireFormat: "Australian Medicare proprietary (not X12). Requires AU-specific claim mapping.",
          transactionSet,
          integrationStatus: "integration-ready",
        },
      };
    }

    return {
      success: false,
      errors: [{
        code: "ECLIPSE-NOT-IMPLEMENTED",
        description: `ECLIPSE ${transactionSet} submission requires live PRODA credentials + AU-format claim mapping.`,
        severity: "error",
      }],
      metadata: {
        targetSystem: "ECLIPSE (Services Australia)",
        transactionSet,
        integrationStatus: "integration-ready",
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [{
        code: "ECLIPSE-STATUS-PENDING",
        description: "ECLIPSE claim status: Medicare Online claim enquiry API. Requires PRODA auth.",
        severity: "info",
      }],
      metadata: { transactionId, integrationStatus: "integration-ready" },
    };
  }

  async fetchResponses(since?: string): Promise<Array<{
    transactionSet: X12TransactionSet;
    payload: string;
    receivedAt: string;
  }>> {
    return [];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    if (!this.configured) {
      return {
        healthy: false,
        details: "ECLIPSE: not configured. Register at https://www.servicesaustralia.gov.au/proda for PRODA organisation access.",
      };
    }
    return {
      healthy: false,
      details: "ECLIPSE: configured but PRODA token exchange requires live connection.",
    };
  }

  async shutdown(): Promise<void> {}
}
