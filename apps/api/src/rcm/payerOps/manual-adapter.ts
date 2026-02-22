/**
 * ManualAdapter — Phase 87: Philippines RCM Foundation
 *
 * Default adapter for all payers. Generates:
 *   - Print packs (structured JSON for PDF rendering)
 *   - Checklists with step-by-step instructions
 *   - Email templates for payer submission
 *
 * Every operation returns status "manual_required" with actionable output.
 * No pretend-success. No automation claims.
 */

import { randomBytes } from "node:crypto";
import type {
  PayerOpsAdapter,
  PayerOpsResult,
  LOACase,
} from "./types.js";

function correlationId(): string {
  return `manual-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

export class ManualAdapter implements PayerOpsAdapter {
  readonly id = "manual";
  readonly name = "Manual Workflow";
  readonly mode = "manual" as const;

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
    return {
      status: "manual_required",
      data: { submissionRef: undefined },
      evidence: {
        timestamp: timestamp(),
        modeUsed: "manual",
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: "Manual workflow: Print the LOA submission pack and deliver to the payer portal or office.",
    };
  }

  async checkEligibility(params: {
    patientDfn: string;
    payerId: string;
    memberId?: string;
  }): Promise<PayerOpsResult<{ eligible?: boolean; details?: string }>> {
    const corrId = correlationId();
    return {
      status: "manual_required",
      data: { details: "Contact payer directly to verify member eligibility." },
      evidence: {
        timestamp: timestamp(),
        modeUsed: "manual",
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: `Manual eligibility check required for payer ${params.payerId}. Use the payer portal or call the ` +
        `payer's provider hotline with the member ID.`,
    };
  }

  async submitClaim(params: {
    claimId: string;
    payerId: string;
  }): Promise<PayerOpsResult<{ trackingId?: string }>> {
    const corrId = correlationId();
    return {
      status: "manual_required",
      data: { trackingId: undefined },
      evidence: {
        timestamp: timestamp(),
        modeUsed: "manual",
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: "Manual claim submission: Export the claim pack and submit via the payer portal or courier.",
    };
  }

  async pollClaimStatus(params: {
    claimId: string;
    payerId: string;
  }): Promise<PayerOpsResult<{ status?: string; details?: string }>> {
    const corrId = correlationId();
    return {
      status: "manual_required",
      data: { details: "Check claim status on the payer portal or call provider services." },
      evidence: {
        timestamp: timestamp(),
        modeUsed: "manual",
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: `Manual status check required for claim ${params.claimId}.`,
    };
  }

  async ingestRemittance(params: {
    payerId: string;
    rawData: string;
  }): Promise<PayerOpsResult<{ remittanceId?: string }>> {
    const corrId = correlationId();
    return {
      status: "manual_required",
      data: { remittanceId: undefined },
      evidence: {
        timestamp: timestamp(),
        modeUsed: "manual",
        requestId: corrId,
      },
      audit: { redactionsApplied: true, correlationId: corrId },
      message: "Manual remittance: Download the EOB/remittance from the payer portal and enter into the system.",
    };
  }
}

/**
 * Generate an LOA submission pack for manual printing/delivery.
 * Returns structured data suitable for PDF rendering on the client side.
 */
export function generateLOASubmissionPack(loaCase: LOACase): {
  title: string;
  sections: Array<{ heading: string; content: string }>;
  checklist: string[];
  emailTemplate: { subject: string; body: string };
} {
  return {
    title: `LOA Request — ${loaCase.payerName} (${loaCase.requestType.replace(/_/g, " ")})`,
    sections: [
      {
        heading: "Patient Information",
        content: `DFN: ${loaCase.patientDfn} | Member ID: ${loaCase.memberId || "N/A"} | Plan: ${loaCase.planName || "N/A"}`,
      },
      {
        heading: "Requested Services",
        content: loaCase.requestedServices
          .map(s => `${s.code}: ${s.description}${s.estimatedCost ? ` (Est: ₱${s.estimatedCost.toLocaleString()})` : ""}`)
          .join("\n"),
      },
      {
        heading: "Diagnosis Codes",
        content: loaCase.diagnosisCodes
          .map(d => `${d.code} (${d.type}): ${d.description}`)
          .join("\n"),
      },
      {
        heading: "Attachments",
        content: loaCase.attachmentRefs.length > 0
          ? `${loaCase.attachmentRefs.length} document(s) attached`
          : "No attachments. Consider attaching supporting clinical documents.",
      },
    ],
    checklist: [
      "☐ Verify patient demographics and member ID with payer records",
      "☐ Ensure all required diagnosis codes are included",
      "☐ Attach clinical justification documents (lab results, imaging, physician notes)",
      "☐ Verify facility accreditation status with this payer",
      "☐ Submit via payer-required channel (portal upload / fax / email / courier)",
      "☐ Record payer reference number after submission",
      "☐ Set follow-up reminder for expected response period",
    ],
    emailTemplate: {
      subject: `LOA Request — ${loaCase.requestType.replace(/_/g, " ")} — Patient Ref: ${loaCase.id}`,
      body: [
        `Dear ${loaCase.payerName} Provider Services,`,
        "",
        `Please find the attached Letter of Authorization request for the following:`,
        `- Request Type: ${loaCase.requestType.replace(/_/g, " ")}`,
        `- Member ID: ${loaCase.memberId || "[ENTER MEMBER ID]"}`,
        `- Plan: ${loaCase.planName || "[ENTER PLAN NAME]"}`,
        `- Services Requested: ${loaCase.requestedServices.map(s => s.description).join(", ")}`,
        "",
        `Please acknowledge receipt and provide the expected processing timeline.`,
        "",
        `Regards,`,
        `[Facility Name]`,
        `[Contact Information]`,
      ].join("\n"),
    },
  };
}
