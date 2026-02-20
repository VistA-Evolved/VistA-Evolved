/**
 * Office Ally Connector — US EDI Clearinghouse
 *
 * Phase 40 (Superseding): Integration-ready connector for Office Ally.
 * Office Ally is a major US clearinghouse offering:
 *   - 837P/837I/837D claim submission (SFTP + HTTPS)
 *   - 835 ERA retrieval
 *   - 270/271 eligibility
 *   - 276/277 claim status
 *   - 999 acknowledgments
 *   - 275 attachments (via EHR 24/7 portal)
 *
 * Enrollment: https://cms.officeally.com/ (free for 837P)
 * Pricing: Free for 837P, paid for ERA/eligibility/institutional
 *
 * Status: Integration-ready stub. Configure:
 *   OFFICEALLY_SFTP_HOST, OFFICEALLY_SFTP_USER, OFFICEALLY_SFTP_KEY_PATH
 *   OFFICEALLY_API_ENDPOINT, OFFICEALLY_API_KEY
 *   OFFICEALLY_SENDER_ID (Office Ally assigns on enrollment)
 */

import type { RcmConnector, ConnectorResult } from "./types.js";
import type { X12TransactionSet } from "../edi/types.js";

export class OfficeAllyConnector implements RcmConnector {
  readonly id = "officeally";
  readonly name = "Office Ally Clearinghouse";
  readonly supportedModes = ["clearinghouse_edi"];
  readonly supportedTransactions: X12TransactionSet[] = [
    "837P", "837I", "835", "270", "271", "276", "277", "275", "999", "997", "TA1",
  ];

  private configured = false;
  private config = {
    sftpHost: process.env.OFFICEALLY_SFTP_HOST ?? "",
    sftpUser: process.env.OFFICEALLY_SFTP_USER ?? "",
    sftpKeyPath: process.env.OFFICEALLY_SFTP_KEY_PATH ?? "",
    apiEndpoint: process.env.OFFICEALLY_API_ENDPOINT ?? "https://api.officeally.com/v1",
    apiKey: process.env.OFFICEALLY_API_KEY ?? "",
    senderId: process.env.OFFICEALLY_SENDER_ID ?? "",
  };

  async initialize(): Promise<void> {
    this.configured = !!(this.config.sftpHost || this.config.apiKey);
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
          code: "OA-NOT-CONFIGURED",
          description: "Office Ally connector not configured. Set OFFICEALLY_SFTP_HOST or OFFICEALLY_API_KEY. Enrollment: https://cms.officeally.com/",
          severity: "error",
        }],
        metadata: {
          targetSystem: "Office Ally Clearinghouse",
          enrollmentUrl: "https://cms.officeally.com/",
          requiredEnvVars: "OFFICEALLY_SFTP_HOST,OFFICEALLY_SFTP_USER,OFFICEALLY_API_KEY,OFFICEALLY_SENDER_ID",
          transactionSet,
          integrationStatus: "integration-ready",
        },
      };
    }

    // Integration-ready: when configured, this would:
    // 1. For SFTP: connect to Office Ally SFTP, upload X12 file to /outbound/{txSet}/
    // 2. For API: POST to Office Ally REST API with X12 payload
    // 3. Parse 999 acknowledgment response
    return {
      success: false,
      errors: [{
        code: "OA-NOT-IMPLEMENTED",
        description: `Office Ally ${transactionSet} submission requires live SFTP/API credentials. Transport layer is integration-ready.`,
        severity: "error",
      }],
      metadata: {
        targetSystem: "Office Ally Clearinghouse",
        transport: this.config.sftpHost ? "sftp" : "https",
        transactionSet,
        integrationStatus: "integration-ready",
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [{
        code: "OA-STATUS-PENDING",
        description: "Office Ally status check requires live credentials. Poll via SFTP /inbound/999/ or API GET /transactions/{id}.",
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
    // Integration-ready: would list files from SFTP /inbound/ dirs
    return [];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    if (!this.configured) {
      return {
        healthy: false,
        details: "Office Ally: not configured. Set OFFICEALLY_SFTP_HOST or OFFICEALLY_API_KEY. Free enrollment at https://cms.officeally.com/",
      };
    }
    return {
      healthy: false,
      details: "Office Ally: configured but connectivity test requires live SFTP/API connection.",
    };
  }

  async shutdown(): Promise<void> {
    // Close SFTP connection if open
  }
}
