/**
 * SG NPHC Connector — Singapore National Programme for Healthcare Claims
 *
 * Phase 40 (Superseding): Integration-ready connector for NPHC.
 * NPHC is Singapore's national healthcare claims gateway managed by MOH.
 * Handles MediShield Life + MediSave claims for all licensed institutions.
 *
 * Authentication: SingPass CorpPass + MOH facility license.
 * Format: REST/JSON (MOH-specific schema).
 *
 * Status: Integration-ready stub. Configure:
 *   NPHC_API_ENDPOINT, NPHC_CORPPASS_CLIENT_ID, NPHC_CORPPASS_SECRET,
 *   NPHC_FACILITY_LICENSE
 */

import type { RcmConnector, ConnectorResult } from "./types.js";
import type { X12TransactionSet } from "../edi/types.js";

export class NphcSgConnector implements RcmConnector {
  readonly id = "nphc-sg";
  readonly name = "NPHC Singapore (MediShield Life / MediSave Gateway)";
  readonly supportedModes = ["government_portal"];
  readonly supportedTransactions: X12TransactionSet[] = [
    "837P", "837I", "270", "271",
  ]; // Logical mapping; NPHC uses its own JSON schema

  private configured = false;
  private config = {
    apiEndpoint: process.env.NPHC_API_ENDPOINT ?? "https://api.nphc.gov.sg",
    corpPassClientId: process.env.NPHC_CORPPASS_CLIENT_ID ?? "",
    corpPassSecret: process.env.NPHC_CORPPASS_SECRET ?? "",
    facilityLicense: process.env.NPHC_FACILITY_LICENSE ?? "",
  };

  async initialize(): Promise<void> {
    this.configured = !!(this.config.corpPassClientId && this.config.facilityLicense);
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
          code: "NPHC-NOT-CONFIGURED",
          description: "NPHC connector not configured. Requires MOH facility license + CorpPass authentication. Contact MOH Singapore for API onboarding.",
          severity: "error",
        }],
        metadata: {
          targetSystem: "NPHC Singapore",
          enrollmentUrl: "https://www.moh.gov.sg/",
          requiredEnvVars: "NPHC_CORPPASS_CLIENT_ID,NPHC_CORPPASS_SECRET,NPHC_FACILITY_LICENSE",
          wireFormat: "NPHC REST/JSON (not X12). MediShield Life claim schema.",
          transactionSet,
          integrationStatus: "integration-ready",
        },
      };
    }

    return {
      success: false,
      errors: [{
        code: "NPHC-NOT-IMPLEMENTED",
        description: `NPHC ${transactionSet} submission requires live CorpPass credentials + MOH facility license.`,
        severity: "error",
      }],
      metadata: {
        targetSystem: "NPHC Singapore",
        transactionSet,
        integrationStatus: "integration-ready",
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [{
        code: "NPHC-STATUS-PENDING",
        description: "NPHC claim status check requires live CorpPass authentication.",
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
        details: "NPHC: not configured. Requires MOH facility license + CorpPass. Contact MOH Singapore.",
      };
    }
    return {
      healthy: false,
      details: "NPHC: configured but CorpPass token exchange requires live connection.",
    };
  }

  async shutdown(): Promise<void> {}
}
