/**
 * NZ ACC Connector — New Zealand Accident Compensation Corporation
 *
 * Phase 40 (Superseding): Integration-ready connector for ACC Claim API.
 * ACC (Accident Compensation Corporation) is NZ's universal no-fault
 * accident compensation scheme. All treatment providers can lodge claims.
 *
 * ACC Claim API v2:
 *   - REST/JSON over HTTPS
 *   - OAuth2 authentication (client_credentials)
 *   - Claim lodgement, status check, payment enquiry
 *   - Test environment available at sandbox.api.acc.co.nz
 *
 * Enrollment: https://www.acc.co.nz/for-providers/
 * API docs: https://developer.acc.co.nz/
 *
 * Status: Integration-ready stub. Configure:
 *   ACC_NZ_API_ENDPOINT, ACC_NZ_CLIENT_ID, ACC_NZ_CLIENT_SECRET, ACC_NZ_PROVIDER_ID
 */

import type { RcmConnector, ConnectorResult } from "./types.js";
import type { X12TransactionSet } from "../edi/types.js";

export class AccNzConnector implements RcmConnector {
  readonly id = "acc-nz";
  readonly name = "ACC New Zealand Claim API";
  readonly supportedModes = ["direct_api"];
  readonly supportedTransactions: X12TransactionSet[] = [
    "837P", "276", "277", "835",
  ]; // Logical mapping; ACC uses REST/JSON, not X12

  private configured = false;
  private config = {
    apiEndpoint: process.env.ACC_NZ_API_ENDPOINT ?? "https://api.acc.co.nz",
    sandboxEndpoint: "https://sandbox.api.acc.co.nz",
    clientId: process.env.ACC_NZ_CLIENT_ID ?? "",
    clientSecret: process.env.ACC_NZ_CLIENT_SECRET ?? "",
    providerId: process.env.ACC_NZ_PROVIDER_ID ?? "",
  };

  async initialize(): Promise<void> {
    this.configured = !!(this.config.clientId && this.config.clientSecret);
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
          code: "ACC-NZ-NOT-CONFIGURED",
          description: "ACC NZ connector not configured. Register as treatment provider at https://www.acc.co.nz/for-providers/ then apply for API access.",
          severity: "error",
        }],
        metadata: {
          targetSystem: "ACC New Zealand",
          enrollmentUrl: "https://www.acc.co.nz/for-providers/",
          apiDocsUrl: "https://developer.acc.co.nz/",
          sandboxUrl: "https://sandbox.api.acc.co.nz",
          requiredEnvVars: "ACC_NZ_CLIENT_ID,ACC_NZ_CLIENT_SECRET,ACC_NZ_PROVIDER_ID",
          wireFormat: "REST/JSON (not X12). Claims map to ACC claim lodgement schema.",
          transactionSet,
          integrationStatus: "integration-ready",
        },
      };
    }

    // Integration-ready: when configured, this would:
    // 1. POST /oauth2/token for access token
    // 2. POST /claims/v2 with ACC claim JSON payload
    // 3. Parse response for claim number + status
    return {
      success: false,
      errors: [{
        code: "ACC-NZ-NOT-IMPLEMENTED",
        description: `ACC NZ claim lodgement requires live OAuth2 credentials. Sandbox available at ${this.config.sandboxEndpoint}`,
        severity: "error",
      }],
      metadata: {
        targetSystem: "ACC New Zealand",
        transactionSet,
        integrationStatus: "integration-ready",
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [{
        code: "ACC-NZ-STATUS-PENDING",
        description: "ACC NZ status: GET /claims/v2/{claimNumber}. Requires live OAuth2 token.",
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
        details: "ACC NZ: not configured. Register at https://www.acc.co.nz/for-providers/ and request API access.",
      };
    }
    return {
      healthy: false,
      details: "ACC NZ: configured but OAuth2 token exchange requires live connection.",
    };
  }

  async shutdown(): Promise<void> {}
}
