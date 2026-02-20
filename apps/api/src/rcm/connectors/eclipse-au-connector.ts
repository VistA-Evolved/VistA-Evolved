/**
 * AU ECLIPSE Connector — Australian Medicare/DVA Claims Gateway
 *
 * Phase 40 (Superseding): Integration-ready connector for ECLIPSE.
 * Phase 46: Enhanced with PRODA/cert store probes, provider number checks,
 *           enrollment guidance, and gateway readiness integration.
 *
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
 * Enrollment steps:
 *   1. Register at PRODA (https://proda.humanservices.gov.au)
 *   2. Create organisation and add devices
 *   3. Generate PKI device certificate
 *   4. Obtain Medicare provider number
 *   5. (Optional) Register HPI-I with ADHA
 *   6. Test in ECLIPSE test environment
 *   7. Go-live with Services Australia approval
 *
 * Status: Integration-ready stub. Configure:
 *   ECLIPSE_API_ENDPOINT, ECLIPSE_PRODA_ORG_ID, ECLIPSE_DEVICE_NAME,
 *   ECLIPSE_CERT_PATH, ECLIPSE_PROVIDER_NUMBER, ECLIPSE_HPI_I
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
    providerNumber: process.env.ECLIPSE_PROVIDER_NUMBER ?? "",
    hpiI: process.env.ECLIPSE_HPI_I ?? "",
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
    const issues: string[] = [];
    if (!this.config.prodaOrgId) issues.push('PRODA org ID missing');
    if (!this.config.deviceName) issues.push('device name missing');
    if (!this.config.certPath) issues.push('PKI cert path missing');
    if (!this.config.providerNumber) issues.push('Medicare provider number missing');

    if (!this.configured) {
      return {
        healthy: false,
        details: `ECLIPSE: ${issues.join(', ')}. Register at https://www.servicesaustralia.gov.au/proda`,
      };
    }

    const warnings: string[] = [];
    if (!this.config.providerNumber) warnings.push('provider number not set');
    if (!this.config.hpiI) warnings.push('HPI-I not set (optional)');

    return {
      healthy: true,
      details: `ECLIPSE: PRODA configured${warnings.length ? ` (warnings: ${warnings.join(', ')})` : ''}. Live PRODA token exchange required for claims.`,
    };
  }

  async shutdown(): Promise<void> {}
}
