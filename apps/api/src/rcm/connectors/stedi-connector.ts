/**
 * Stedi Connector — API-first EDI Platform (Feature-flagged)
 *
 * Phase 40 (Superseding): Integration-ready connector for Stedi.
 * Stedi provides a modern API layer over legacy X12 EDI:
 *   - Claim submission (837P/837I) via REST + JSON
 *   - Eligibility (270/271) real-time
 *   - Claim status (276/277)
 *   - ERA (835) retrieval
 *   - X12 parsing/generation APIs
 *
 * Feature-flagged: only active when STEDI_ENABLED=true
 *
 * API docs: https://www.stedi.com/docs
 * Pricing: Usage-based (per transaction)
 *
 * Status: Integration-ready stub. Configure:
 *   STEDI_ENABLED=true
 *   STEDI_API_KEY
 *   STEDI_PARTNER_ID (assigned on signup)
 */

import type { RcmConnector, ConnectorResult } from "./types.js";
import type { X12TransactionSet } from "../edi/types.js";

const STEDI_ENABLED = process.env.STEDI_ENABLED === "true";

export class StediConnector implements RcmConnector {
  readonly id = "stedi";
  readonly name = "Stedi API-first EDI Platform";
  readonly supportedModes = ["clearinghouse_edi", "direct_api"];
  readonly supportedTransactions: X12TransactionSet[] = [
    "837P", "837I", "835", "270", "271", "276", "277", "999",
  ];

  private configured = false;
  private config = {
    apiKey: process.env.STEDI_API_KEY ?? "",
    partnerId: process.env.STEDI_PARTNER_ID ?? "",
    apiEndpoint: process.env.STEDI_API_ENDPOINT ?? "https://healthcare.us.stedi.com/2024-04-01",
  };

  async initialize(): Promise<void> {
    if (!STEDI_ENABLED) return;
    this.configured = !!(this.config.apiKey);
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>,
  ): Promise<ConnectorResult> {
    if (!STEDI_ENABLED) {
      return {
        success: false,
        errors: [{
          code: "STEDI-DISABLED",
          description: "Stedi connector is feature-flagged off. Set STEDI_ENABLED=true to activate.",
          severity: "info",
        }],
        metadata: { integrationStatus: "feature-flagged", transactionSet },
      };
    }

    if (!this.configured) {
      return {
        success: false,
        errors: [{
          code: "STEDI-NOT-CONFIGURED",
          description: "Stedi connector enabled but not configured. Set STEDI_API_KEY. Docs: https://www.stedi.com/docs",
          severity: "error",
        }],
        metadata: {
          targetSystem: "Stedi EDI Platform",
          apiDocsUrl: "https://www.stedi.com/docs",
          requiredEnvVars: "STEDI_API_KEY,STEDI_PARTNER_ID",
          transactionSet,
          integrationStatus: "integration-ready",
        },
      };
    }

    // Integration-ready: when configured, this would:
    // 1. POST /change/v1/x12 (send X12 payload)
    // 2. Or POST /change/v1/json-to-x12 (send JSON representation)
    // 3. Parse response for 999 ack or real-time adjudication
    return {
      success: false,
      errors: [{
        code: "STEDI-NOT-IMPLEMENTED",
        description: `Stedi ${transactionSet} submission requires live API key and partner enrollment.`,
        severity: "error",
      }],
      metadata: {
        targetSystem: "Stedi EDI Platform",
        transactionSet,
        integrationStatus: "integration-ready",
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    if (!STEDI_ENABLED) {
      return {
        success: false,
        errors: [{ code: "STEDI-DISABLED", description: "Feature-flagged off.", severity: "info" }],
      };
    }
    return {
      success: false,
      errors: [{
        code: "STEDI-STATUS-PENDING",
        description: "Stedi status: GET /change/v1/x12/transactions/{id}. Requires live API key.",
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
    if (!STEDI_ENABLED) {
      return { healthy: false, details: "Stedi: feature-flagged off (STEDI_ENABLED != true)." };
    }
    if (!this.configured) {
      return { healthy: false, details: "Stedi: enabled but STEDI_API_KEY not set. Docs: https://www.stedi.com/docs" };
    }
    return { healthy: false, details: "Stedi: configured but health probe requires live API call." };
  }

  async shutdown(): Promise<void> {}
}
