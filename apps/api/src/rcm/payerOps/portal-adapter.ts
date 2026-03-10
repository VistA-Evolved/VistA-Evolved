/**
 * PortalAdapter -- Phase 87: Philippines RCM Foundation
 *
 * For payers that provide a web portal but no API.
 * Stores portal URL + step-by-step instructions.
 * NO automation -- returns "manual_required" with portal-specific guidance.
 *
 * Slightly richer than ManualAdapter:
 *   - Includes direct portal URLs
 *   - Has payer-specific step instructions
 *   - Generates portal navigation guides
 */

import { randomBytes } from 'node:crypto';
import type { PayerOpsAdapter, PayerOpsResult, LOACase } from './types.js';

function correlationId(): string {
  return `portal-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

export interface PortalConfig {
  payerId: string;
  portalUrl: string;
  /** Step-by-step instructions for using this payer's portal */
  steps: string[];
  /** Known portal limitations or quirks */
  notes?: string;
}

export class PortalAdapter implements PayerOpsAdapter {
  readonly id = 'portal';
  readonly name = 'Portal Workflow';
  readonly mode = 'portal' as const;

  private configs = new Map<string, PortalConfig>();

  registerPortalConfig(config: PortalConfig): void {
    this.configs.set(config.payerId, config);
  }

  getPortalConfig(payerId: string): PortalConfig | undefined {
    return this.configs.get(payerId);
  }

  listPortalConfigs(): PortalConfig[] {
    return Array.from(this.configs.values());
  }

  capabilities() {
    return {
      eligibility: true,
      loa: true,
      claims: true,
      claimStatus: true,
      remittance: true,
    };
  }

  async submitLOA(loaCase: LOACase): Promise<PayerOpsResult<{ submissionRef?: string }>> {
    const corrId = correlationId();
    const config = this.configs.get(loaCase.payerId);
    const portalUrl = config?.portalUrl || '[No portal URL configured]';
    const steps = config?.steps || ['Navigate to the payer portal and submit the LOA manually.'];

    return {
      status: 'manual_required',
      data: { submissionRef: undefined },
      evidence: {
        timestamp: timestamp(),
        modeUsed: 'portal',
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: [
        `Portal submission required for ${loaCase.payerName}.`,
        `Portal URL: ${portalUrl}`,
        `Steps:`,
        ...steps.map((s, i) => `  ${i + 1}. ${s}`),
        config?.notes ? `Note: ${config.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  async checkEligibility(params: {
    patientDfn: string;
    payerId: string;
    memberId?: string;
  }): Promise<PayerOpsResult<{ eligible?: boolean; details?: string }>> {
    const corrId = correlationId();
    const config = this.configs.get(params.payerId);
    const portalUrl = config?.portalUrl || '[No portal URL configured]';

    return {
      status: 'manual_required',
      data: { details: `Check eligibility at: ${portalUrl}` },
      evidence: {
        timestamp: timestamp(),
        modeUsed: 'portal',
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: `Navigate to ${portalUrl} to verify member eligibility for payer ${params.payerId}.`,
    };
  }

  async submitClaim(params: {
    claimId: string;
    payerId: string;
  }): Promise<PayerOpsResult<{ trackingId?: string }>> {
    const corrId = correlationId();
    const config = this.configs.get(params.payerId);
    const portalUrl = config?.portalUrl || '[No portal URL configured]';

    return {
      status: 'manual_required',
      data: { trackingId: undefined },
      evidence: {
        timestamp: timestamp(),
        modeUsed: 'portal',
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: `Upload claim ${params.claimId} at: ${portalUrl}`,
    };
  }

  async pollClaimStatus(params: {
    claimId: string;
    payerId: string;
  }): Promise<PayerOpsResult<{ status?: string; details?: string }>> {
    const corrId = correlationId();
    const config = this.configs.get(params.payerId);
    const portalUrl = config?.portalUrl || '[No portal URL configured]';

    return {
      status: 'manual_required',
      data: { details: `Track claim at: ${portalUrl}` },
      evidence: {
        timestamp: timestamp(),
        modeUsed: 'portal',
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: `Check claim ${params.claimId} status at: ${portalUrl}`,
    };
  }

  async ingestRemittance(params: {
    payerId: string;
    rawData: string;
  }): Promise<PayerOpsResult<{ remittanceId?: string }>> {
    const corrId = correlationId();
    const config = this.configs.get(params.payerId);
    const portalUrl = config?.portalUrl || '[No portal URL configured]';

    return {
      status: 'manual_required',
      data: { remittanceId: undefined },
      evidence: {
        timestamp: timestamp(),
        modeUsed: 'portal',
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: `Download remittance/EOB from: ${portalUrl}`,
    };
  }
}

/* -- Singleton portal adapter instance ----------------------- */

let portalAdapterInstance: PortalAdapter | undefined;

export function getPortalAdapter(): PortalAdapter {
  if (!portalAdapterInstance) {
    portalAdapterInstance = new PortalAdapter();
  }
  return portalAdapterInstance;
}
